package docker

import (
	"context"
	"fmt"
	"io"
	"log"
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

	// Use the provided dataPath directly
	log.Printf("Initializing Docker manager with data path: %s", dataPath)

	return &Manager{
		client:        cli,
		containerName: containerName,
		image:         image,
		dataPath:      dataPath,
		maxMemory:     fmt.Sprintf("%dM", maxMemoryMB),
	}, nil
}

func (m *Manager) StartContainer(env []string) error {
	ctx := context.Background()

	log.Printf("Starting container with parameters:")
	log.Printf("- Image: %s", m.image)
	log.Printf("- Container name: %s", m.containerName)
	log.Printf("- Data path: %s", m.dataPath)
	log.Printf("- Environment variables: %v", env)

	// Pull the image
	log.Printf("Pulling image %s", m.image)
	reader, err := m.client.ImagePull(ctx, m.image, types.ImagePullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image: %v", err)
	}
	io.Copy(io.Discard, reader)

	// Check for existing container
	containers, err := m.client.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return fmt.Errorf("failed to list containers: %v", err)
	}

	var containerID string
	var needNewContainer bool = true

	for _, cont := range containers {
		if cont.Names[0] == "/"+m.containerName {
			containerID = cont.ID
			log.Printf("Found existing container with ID: %s", containerID)

			// Check if container has different environment variables
			inspect, err := m.client.ContainerInspect(ctx, containerID)
			if err != nil {
				log.Printf("Error inspecting container: %v", err)
				needNewContainer = true
				break
			}

			// Compare environment variables
			currentEnv := make(map[string]string)
			for _, e := range inspect.Config.Env {
				parts := strings.SplitN(e, "=", 2)
				if len(parts) == 2 {
					currentEnv[parts[0]] = parts[1]
				}
			}

			// Check if version changed
			var versionChanged bool
			for _, e := range env {
				parts := strings.SplitN(e, "=", 2)
				if len(parts) == 2 && parts[0] == "VERSION" {
					if currentValue, exists := currentEnv["VERSION"]; !exists || currentValue != parts[1] {
						versionChanged = true
						break
					}
				}
			}

			if versionChanged {
				log.Printf("Version changed, creating new container")
				// Stop the container but don't remove it (preserve data)
				timeout := 30 // seconds
				err := m.client.ContainerStop(ctx, containerID, container.StopOptions{
					Timeout: &timeout,
				})
				if err != nil {
					log.Printf("Warning: error stopping container: %v", err)
				}
				needNewContainer = true
			} else {
				needNewContainer = false
			}
			break
		}
	}

	if needNewContainer {
		log.Printf("Creating new container with configuration:")
		containerConfig := &container.Config{
			Image: m.image,
			Env:   env,
		}
		hostConfig := &container.HostConfig{
			Mounts: []mount.Mount{
				{
					Type:   mount.TypeBind,
					Source: "./minecraft-data", // Use relative path
					Target: "/data",
				},
			},
			PortBindings: nat.PortMap{
				"25565/tcp": []nat.PortBinding{{HostIP: "0.0.0.0", HostPort: "25565"}},
			},
		}

		log.Printf("Container config: %+v", containerConfig)
		log.Printf("Host config: %+v", hostConfig)

		resp, err := m.client.ContainerCreate(ctx, containerConfig, hostConfig, nil, nil, m.containerName)
		if err != nil {
			return fmt.Errorf("failed to create container: %v", err)
		}
		containerID = resp.ID
		log.Printf("Created new container with ID: %s", containerID)
	} else {
		log.Printf("Reusing existing container with ID: %s", containerID)
	}

	// Start the container
	log.Printf("Starting container %s", containerID)
	if err := m.client.ContainerStart(ctx, containerID, types.ContainerStartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %v", err)
	}
	log.Printf("Successfully started container %s", containerID)

	return nil
}

func (m *Manager) StopContainer() error {
	ctx := context.Background()
	timeoutSeconds := 30

	if err := m.client.ContainerStop(ctx, m.containerName, container.StopOptions{
		Timeout: &timeoutSeconds,
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
