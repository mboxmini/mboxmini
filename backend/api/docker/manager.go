package docker

import (
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

type Manager struct {
	client    *client.Client
	dataPath  string
	portStart int
	portEnd   int
	mu        sync.Mutex
	portInUse map[int]string
}

type ServerInfo struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Status  string   `json:"status"`
	Version string   `json:"version"`
	Port    int      `json:"port"`
	Players []string `json:"players"`
}

func NewManager(dataPath string, portStart, portEnd int) (*Manager, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %v", err)
	}

	m := &Manager{
		client:    cli,
		dataPath:  dataPath,
		portStart: portStart,
		portEnd:   portEnd,
		portInUse: make(map[int]string),
	}

	// Initialize port tracking by checking existing containers
	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %v", err)
	}

	for _, cont := range containers {
		if !strings.HasPrefix(cont.Image, "itzg/minecraft-server") {
			continue
		}

		for _, p := range cont.Ports {
			if p.PrivatePort == 25565 {
				m.portInUse[int(p.PublicPort)] = strings.TrimPrefix(cont.Names[0], "/")
				break
			}
		}
	}

	return m, nil
}

func (m *Manager) findAvailablePort() (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// First try to find a port in the configured range
	for port := m.portStart; port <= m.portEnd; port++ {
		// Check if port is in use by our tracking
		if _, exists := m.portInUse[port]; exists {
			continue
		}

		// Check if port is in use by the system
		listener, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
		if err != nil {
			continue
		}
		listener.Close()

		return port, nil
	}

	return 0, fmt.Errorf("no available ports in range %d-%d", m.portStart, m.portEnd)
}

func (m *Manager) CreateServer(name, version, memory string) (string, error) {
	log.Printf("Starting server creation - Name: %s, Version: %s, Memory: %s", name, version, memory)

	if memory == "" {
		memory = "2G"
		log.Printf("Using default memory: %s", memory)
	}

	port, err := m.findAvailablePort()
	if err != nil {
		log.Printf("Error finding available port: %v", err)
		return "", err
	}
	log.Printf("Found available port: %d", port)

	serverID := fmt.Sprintf("mboxmini-%s", name)
	log.Printf("Generated server ID: %s", serverID)

	// Create server data directory on host using a temporary container
	serverDataDir := filepath.Join(m.dataPath, serverID)
	log.Printf("Creating server data directory on host: %s", serverDataDir)

	// Pull alpine image first
	log.Printf("Pulling alpine image...")
	reader, err := m.client.ImagePull(context.Background(), "alpine:latest", types.ImagePullOptions{})
	if err != nil {
		log.Printf("Error pulling alpine image: %v", err)
		return "", fmt.Errorf("failed to pull alpine image: %v", err)
	}
	io.Copy(io.Discard, reader)
	reader.Close()

	// Use alpine container to create directory
	mkdirCmd := fmt.Sprintf("mkdir -p %s", serverDataDir)
	resp, err := m.client.ContainerCreate(
		context.Background(),
		&container.Config{
			Image: "alpine:latest",
			Cmd:   []string{"sh", "-c", mkdirCmd},
		},
		&container.HostConfig{
			AutoRemove: true,
			Mounts: []mount.Mount{
				{
					Type:   mount.TypeBind,
					Source: filepath.Dir(m.dataPath),
					Target: filepath.Dir(m.dataPath),
				},
			},
		},
		nil,
		nil,
		"",
	)
	if err != nil {
		log.Printf("Error creating directory container: %v", err)
		return "", fmt.Errorf("failed to create directory container: %v", err)
	}

	if err := m.client.ContainerStart(context.Background(), resp.ID, types.ContainerStartOptions{}); err != nil {
		log.Printf("Error starting directory container: %v", err)
		return "", fmt.Errorf("failed to start directory container: %v", err)
	}

	// Wait for container to finish
	statusCh, errCh := m.client.ContainerWait(context.Background(), resp.ID, container.WaitConditionNotRunning)
	select {
	case err := <-errCh:
		if err != nil {
			log.Printf("Error waiting for directory container: %v", err)
			return "", fmt.Errorf("failed waiting for directory container: %v", err)
		}
	case <-statusCh:
	}

	env := []string{
		"EULA=TRUE",
		fmt.Sprintf("VERSION=%s", version),
		"TYPE=VANILLA",
		fmt.Sprintf("MEMORY=%s", memory),
	}
	log.Printf("Environment variables: %v", env)

	// Create Minecraft server container
	containerConfig := &container.Config{
		Image: "itzg/minecraft-server:latest",
		Env:   env,
	}

	hostConfig := &container.HostConfig{
		Mounts: []mount.Mount{
			{
				Type:   mount.TypeBind,
				Source: serverDataDir,
				Target: "/data",
			},
		},
		PortBindings: nat.PortMap{
			"25565/tcp": []nat.PortBinding{{HostIP: "0.0.0.0", HostPort: fmt.Sprintf("%d", port)}},
		},
	}

	// Create the container
	_, err = m.client.ContainerCreate(
		context.Background(),
		containerConfig,
		hostConfig,
		nil,
		nil,
		serverID,
	)
	if err != nil {
		log.Printf("Error creating container: %v", err)
		return "", fmt.Errorf("failed to create container: %v", err)
	}

	// Start the container
	log.Printf("Starting container %s", serverID)
	if err := m.client.ContainerStart(context.Background(), serverID, types.ContainerStartOptions{}); err != nil {
		log.Printf("Error starting container: %v", err)
		// Clean up on failure
		if rmErr := m.client.ContainerRemove(context.Background(), serverID, types.ContainerRemoveOptions{Force: true}); rmErr != nil {
			log.Printf("Error removing container after failed start: %v", rmErr)
		}
		return "", fmt.Errorf("failed to start container: %v", err)
	}

	m.mu.Lock()
	m.portInUse[port] = serverID
	m.mu.Unlock()

	log.Printf("Server created and started successfully with ID: %s", serverID)
	return serverID, nil
}

func (m *Manager) ListServers() ([]ServerInfo, error) {
	containers, err := m.client.ContainerList(context.Background(), types.ContainerListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %v", err)
	}

	var servers []ServerInfo
	for _, cont := range containers {
		// Only include containers that use the Minecraft server image
		if !strings.HasPrefix(cont.Image, "itzg/minecraft-server") {
			continue
		}

		serverID := strings.TrimPrefix(cont.Names[0], "/")
		inspect, err := m.client.ContainerInspect(context.Background(), cont.ID)
		if err != nil {
			log.Printf("Error inspecting container %s: %v", serverID, err)
			continue
		}

		// Extract version from environment variables
		var version string
		for _, env := range inspect.Config.Env {
			if strings.HasPrefix(env, "VERSION=") {
				version = strings.TrimPrefix(env, "VERSION=")
				break
			}
		}

		// Get port mapping
		var port int
		for _, p := range cont.Ports {
			if p.PrivatePort == 25565 {
				port = int(p.PublicPort)
				break
			}
		}

		// Get players if server is running
		var players []string
		if cont.State == "running" {
			if playerList, err := m.getPlayers(serverID); err == nil {
				players = playerList
			}
		}

		servers = append(servers, ServerInfo{
			ID:      serverID,
			Name:    strings.TrimPrefix(serverID, "mboxmini-"),
			Status:  cont.State,
			Version: version,
			Port:    port,
			Players: players,
		})
	}

	return servers, nil
}

func (m *Manager) GetServerStatus(serverID string) (*ServerInfo, error) {
	inspect, err := m.client.ContainerInspect(context.Background(), serverID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container: %v", err)
	}

	// Extract version from environment variables
	var version string
	for _, env := range inspect.Config.Env {
		if strings.HasPrefix(env, "VERSION=") {
			version = strings.TrimPrefix(env, "VERSION=")
			break
		}
	}

	// Get port mapping
	var port int
	for p := range inspect.NetworkSettings.Ports {
		if strings.HasPrefix(string(p), "25565") {
			bindings := inspect.NetworkSettings.Ports[p]
			if len(bindings) > 0 {
				if p, err := nat.ParsePort(bindings[0].HostPort); err == nil {
					port = int(p)
				}
			}
			break
		}
	}

	// Get players if server is running
	var players []string
	if inspect.State.Running {
		if playerList, err := m.getPlayers(serverID); err == nil {
			players = playerList
		}
	}

	return &ServerInfo{
		ID:      serverID,
		Name:    strings.TrimPrefix(serverID, "mboxmini-"),
		Status:  inspect.State.Status,
		Version: version,
		Port:    port,
		Players: players,
	}, nil
}

func (m *Manager) StartServer(serverID string) error {
	return m.client.ContainerStart(context.Background(), serverID, types.ContainerStartOptions{})
}

func (m *Manager) StopServer(serverID string) error {
	timeout := 30 // seconds
	return m.client.ContainerStop(context.Background(), serverID, container.StopOptions{
		Timeout: &timeout,
	})
}

func (m *Manager) ExecuteCommand(ctx context.Context, serverID, cmd string) error {
	execConfig := types.ExecConfig{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,
		Cmd:          []string{"rcon-cli", cmd},
	}

	log.Printf("Executing command in container %s: %v", serverID, execConfig.Cmd)

	execID, err := m.client.ContainerExecCreate(ctx, serverID, execConfig)
	if err != nil {
		return fmt.Errorf("failed to create exec: %v", err)
	}

	resp, err := m.client.ContainerExecAttach(ctx, execID.ID, types.ExecStartCheck{})
	if err != nil {
		return fmt.Errorf("failed to attach to exec: %v", err)
	}
	defer resp.Close()

	output, err := io.ReadAll(resp.Reader)
	if err != nil {
		return fmt.Errorf("failed to read exec output: %v", err)
	}

	log.Printf("Command output: %s", string(output))
	return nil
}

func (m *Manager) getPlayers(serverID string) ([]string, error) {
	execConfig := types.ExecConfig{
		AttachStdin:  true,
		AttachStdout: true,
		AttachStderr: true,
		Tty:          true,

		Cmd: []string{"rcon-cli", "list"},
	}

	log.Printf("Getting player list for server %s", serverID)

	execID, err := m.client.ContainerExecCreate(context.Background(), serverID, execConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create exec: %v", err)
	}

	resp, err := m.client.ContainerExecAttach(context.Background(), execID.ID, types.ExecStartCheck{})
	if err != nil {
		return nil, fmt.Errorf("failed to attach to exec: %v", err)
	}
	defer resp.Close()

	output, err := io.ReadAll(resp.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read exec output: %v", err)
	}

	outputStr := string(output)
	log.Printf("Player list output: %s", outputStr)

	if strings.Contains(outputStr, "There are 0") {
		return []string{}, nil
	}

	var players []string
	lines := strings.Split(outputStr, "\n")
	for _, line := range lines {
		if strings.Contains(line, "players online:") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				playerList := strings.TrimSpace(parts[1])
				if playerList != "" {
					players = strings.Split(playerList, ", ")
				}
			}
			break
		}
	}

	return players, nil
}

func (m *Manager) DeleteServer(serverID string) error {
	// First stop the server if it's running
	container, err := m.client.ContainerInspect(context.Background(), serverID)
	if err != nil {
		return fmt.Errorf("failed to inspect container: %v", err)
	}

	// Get the port from the container
	var port int
	for p := range container.NetworkSettings.Ports {
		if strings.HasPrefix(string(p), "25565") {
			bindings := container.NetworkSettings.Ports[p]
			if len(bindings) > 0 {
				if p, err := strconv.Atoi(bindings[0].HostPort); err == nil {
					port = p
				}
			}
			break
		}
	}

	// Remove the container with force (stops it if running)
	if err := m.client.ContainerRemove(context.Background(), serverID, types.ContainerRemoveOptions{
		Force: true,
	}); err != nil {
		return fmt.Errorf("failed to remove container: %v", err)
	}

	// Remove the server data directory
	serverDataDir := filepath.Join(m.dataPath, serverID)
	if err := os.RemoveAll(serverDataDir); err != nil {
		log.Printf("Warning: failed to remove server data directory: %v", err)
	}

	// Release the port
	m.mu.Lock()
	delete(m.portInUse, port)
	m.mu.Unlock()

	return nil
}
