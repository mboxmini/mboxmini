package docker

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

type Manager struct {
	client        *client.Client
	containerName string
	image         string
	dataPath      string
	maxMemory     string
}

func NewManager(containerName, image, dataPath string, maxMemoryMB int) (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %v", err)
	}

	return &Manager{
		client:        cli,
		containerName: containerName,
		image:         image,
		dataPath:      dataPath,
		maxMemory:     fmt.Sprintf("%dM", maxMemoryMB),
	}, nil
}

func (m *Manager) StartContainer() error {
	ctx := context.Background()

	// Pull the image
	reader, err := m.client.ImagePull(ctx, m.image, types.ImagePullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image: %v", err)
	}
	io.Copy(io.Discard, reader)

	// Create container if it doesn't exist
	containers, err := m.client.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return fmt.Errorf("failed to list containers: %v", err)
	}

	var containerID string
	for _, cont := range containers {
		if cont.Names[0] == "/"+m.containerName {
			containerID = cont.ID
			break
		}
	}

	if containerID == "" {
		// Create new container
		resp, err := m.client.ContainerCreate(ctx, &container.Config{
			Image: m.image,
			Env: []string{
				"EULA=TRUE",
				"MEMORY=" + m.maxMemory,
			},
		}, &container.HostConfig{
			Mounts: []mount.Mount{
				{
					Type:   mount.TypeBind,
					Source: m.dataPath,
					Target: "/data",
				},
			},
			PortBindings: nat.PortMap{
				"25565/tcp": []nat.PortBinding{{HostIP: "0.0.0.0", HostPort: "25565"}},
			},
		}, nil, nil, m.containerName)
		if err != nil {
			return fmt.Errorf("failed to create container: %v", err)
		}
		containerID = resp.ID
	}

	// Start the container
	if err := m.client.ContainerStart(ctx, containerID, types.ContainerStartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %v", err)
	}

	return nil
}

func (m *Manager) StopContainer() error {
	ctx := context.Background()
	timeout := 30 * time.Second

	if err := m.client.ContainerStop(ctx, m.containerName, container.StopOptions{
		Timeout: &timeout,
	}); err != nil {
		return fmt.Errorf("failed to stop container: %v", err)
	}

	return nil
}

func (m *Manager) GetContainerStatus() (string, error) {
	ctx := context.Background()

	containers, err := m.client.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return "", fmt.Errorf("failed to list containers: %v", err)
	}

	for _, cont := range containers {
		if cont.Names[0] == "/"+m.containerName {
			return cont.State, nil
		}
	}

	return "not found", nil
}

func (m *Manager) ExecuteCommand(ctx context.Context, cmd string) error {
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          strings.Split(cmd, " "),
	}

	execID, err := m.client.ContainerExecCreate(ctx, m.containerName, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %v", err)
	}

	if err := m.client.ContainerExecStart(ctx, execID.ID, types.ExecStartCheck{}); err != nil {
		return fmt.Errorf("failed to start exec: %v", err)
	}

	return nil
}

func (m *Manager) ListPlayers() ([]string, error) {
	ctx := context.Background()

	// Execute list players command
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"list", "players"},
	}

	execID, err := m.client.ContainerExecCreate(ctx, m.containerName, execConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create exec: %v", err)
	}

	resp, err := m.client.ContainerExecAttach(ctx, execID.ID, types.ExecStartCheck{})
	if err != nil {
		return nil, fmt.Errorf("failed to attach to exec: %v", err)
	}
	defer resp.Close()

	output, err := io.ReadAll(resp.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read exec output: %v", err)
	}

	// Parse the output to extract player names
	outputStr := string(output)
	if strings.Contains(outputStr, "There are 0 of a max of") {
		return []string{}, nil
	}

	// Extract player names from the output
	players := []string{}
	lines := strings.Split(outputStr, "\n")
	for _, line := range lines {
		if strings.Contains(line, "players online:") {
			playerList := strings.Split(line, ":")[1]
			playerNames := strings.Split(strings.TrimSpace(playerList), ", ")
			players = append(players, playerNames...)
		}
	}

	return players, nil
}
