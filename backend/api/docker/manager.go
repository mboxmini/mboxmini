package docker

import (
	"context"
	"fmt"
	"io"
	"strings"

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

func (m *Manager) StartServer(ctx context.Context) error {
	containers, err := m.client.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return fmt.Errorf("failed to list containers: %v", err)
	}

	var containerID string
	for _, container := range containers {
		for _, name := range container.Names {
			if name == "/"+m.containerName {
				containerID = container.ID
				break
			}
		}
	}

	if containerID == "" {
		// Create container if it doesn't exist
		resp, err := m.client.ContainerCreate(ctx,
			&container.Config{
				Image: m.image,
				Env:   []string{"EULA=TRUE"},
				ExposedPorts: nat.PortSet{
					"25565/tcp": struct{}{},
				},
			},
			&container.HostConfig{
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
			},
			nil,
			nil,
			m.containerName,
		)
		if err != nil {
			return fmt.Errorf("failed to create container: %v", err)
		}
		containerID = resp.ID
	}

	return m.client.ContainerStart(ctx, containerID, types.ContainerStartOptions{})
}

func (m *Manager) StopServer(ctx context.Context) error {
	return m.client.ContainerStop(ctx, m.containerName, container.StopOptions{})
}

func (m *Manager) ExecuteCommand(ctx context.Context, command string) error {
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"rcon-cli", command},
	}

	execID, err := m.client.ContainerExecCreate(ctx, m.containerName, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %v", err)
	}

	return m.client.ContainerExecStart(ctx, execID.ID, types.ExecStartCheck{})
}

func (m *Manager) GetServerStatus(ctx context.Context) (map[string]interface{}, error) {
	containers, err := m.client.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %v", err)
	}

	status := make(map[string]interface{})
	for _, container := range containers {
		for _, name := range container.Names {
			if name == "/"+m.containerName {
				status["status"] = container.State
				status["running"] = container.State == "running"
				return status, nil
			}
		}
	}

	return map[string]interface{}{
		"status":  "not found",
		"running": false,
	}, nil
}

func (m *Manager) GetOnlinePlayers(ctx context.Context) ([]string, error) {
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"rcon-cli", "list"},
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

	players := strings.Split(string(output), ":")
	if len(players) < 2 {
		return []string{}, nil
	}

	playerList := strings.Split(strings.TrimSpace(players[1]), ",")
	if len(playerList) == 1 && playerList[0] == "" {
		return []string{}, nil
	}

	return playerList, nil
}

func (m *Manager) UpdateServerProperties(ctx context.Context, properties map[string]string) error {
	execConfig := types.ExecConfig{
		AttachStdout: true,
		AttachStderr: true,
		Cmd:          []string{"sh", "-c", fmt.Sprintf("cd /data && echo '%s' > server.properties", m.formatProperties(properties))},
	}

	execID, err := m.client.ContainerExecCreate(ctx, m.containerName, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %v", err)
	}

	return m.client.ContainerExecStart(ctx, execID.ID, types.ExecStartCheck{})
}

func (m *Manager) formatProperties(properties map[string]string) string {
	var sb strings.Builder
	for key, value := range properties {
		sb.WriteString(fmt.Sprintf("%s=%s\n", key, value))
	}
	return sb.String()
}
