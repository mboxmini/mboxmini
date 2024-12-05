package docker

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
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

func NewManager(containerName, image, dataPath, maxMemory string) (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, err
	}

	return &Manager{
		client:        cli,
		containerName: containerName,
		image:         image,
		dataPath:      dataPath,
		maxMemory:     maxMemory,
	}, nil
}

func (m *Manager) StartServer(ctx context.Context) error {
	containers, err := m.client.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return err
	}

	var containerID string
	for _, container := range containers {
		if container.Names[0] == "/"+m.containerName {
			containerID = container.ID
			break
		}
	}

	if containerID == "" {
		resp, err := m.client.ContainerCreate(ctx, &container.Config{
			Image: m.image,
			Env: []string{
				"EULA=TRUE",
				fmt.Sprintf("MEMORY=%s", m.maxMemory),
			},
		}, &container.HostConfig{
			Binds: []string{
				fmt.Sprintf("%s:/data", m.dataPath),
			},
			PortBindings: map[nat.Port][]nat.PortBinding{
				"25565/tcp": {{HostIP: "0.0.0.0", HostPort: "25565"}},
			},
		}, nil, nil, m.containerName)
		if err != nil {
			return err
		}
		containerID = resp.ID
	}

	return m.client.ContainerStart(ctx, containerID, types.ContainerStartOptions{})
}

func (m *Manager) StopServer(ctx context.Context) error {
	timeout := 30 // seconds
	return m.client.ContainerStop(ctx, m.containerName, container.StopOptions{Timeout: &timeout})
}

func (m *Manager) ExecuteCommand(ctx context.Context, command string) error {
	exec, err := m.client.ContainerExecCreate(ctx, m.containerName, types.ExecConfig{
		Cmd:          []string{"rcon-cli", command},
		AttachStdout: true,
		AttachStderr: true,
	})
	if err != nil {
		return err
	}

	return m.client.ContainerExecStart(ctx, exec.ID, types.ExecStartCheck{})
}

func (m *Manager) GetServerStatus(ctx context.Context) (map[string]interface{}, error) {
	container, err := m.client.ContainerInspect(ctx, m.containerName)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"status":  container.State.Status,
		"running": container.State.Running,
		"started": container.State.StartedAt,
		"memory":  m.maxMemory,
	}, nil
}

func (m *Manager) GetOnlinePlayers(ctx context.Context) ([]string, error) {
	exec, err := m.client.ContainerExecCreate(ctx, m.containerName, types.ExecConfig{
		Cmd:          []string{"rcon-cli", "list"},
		AttachStdout: true,
	})
	if err != nil {
		return nil, err
	}

	resp, err := m.client.ContainerExecAttach(ctx, exec.ID, types.ExecStartCheck{})
	if err != nil {
		return nil, err
	}
	defer resp.Close()

	// Simple implementation - in production you'd want to properly parse the output
	return []string{}, nil
}

func (m *Manager) UpdateServerProperties(ctx context.Context, properties map[string]string) error {
	propsPath := filepath.Join(m.dataPath, "server.properties")

	// Read existing properties
	existing, err := readPropertiesFile(propsPath)
	if err != nil {
		return err
	}

	// Update with new values
	for k, v := range properties {
		if !isAllowedProperty(k) {
			return fmt.Errorf("property %s is not allowed to be modified", k)
		}
		existing[k] = v
	}

	// Write back to file
	return writePropertiesFile(propsPath, existing)
}

func readPropertiesFile(path string) (map[string]string, error) {
	properties := make(map[string]string)

	if _, err := os.Stat(path); os.IsNotExist(err) {
		return properties, nil
	}

	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			properties[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}

	return properties, scanner.Err()
}

func writePropertiesFile(path string, properties map[string]string) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := bufio.NewWriter(file)
	for key, value := range properties {
		_, err := fmt.Fprintf(writer, "%s=%s\n", key, value)
		if err != nil {
			return err
		}
	}

	return writer.Flush()
}

func isAllowedProperty(property string) bool {
	allowedProps := map[string]bool{
		"max-players":      true,
		"difficulty":       true,
		"pvp":              true,
		"allow-flight":     true,
		"spawn-protection": true,
		"max-world-size":   true,
		"view-distance":    true,
	}
	return allowedProps[property]
}
