package docker

import (
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"
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

	// Ensure data directory exists
	log.Printf("Ensuring data directory exists: %s", dataPath)
	if err := os.MkdirAll(dataPath, 0755); err != nil {
		log.Printf("Error creating data directory: %v", err)
		return nil, fmt.Errorf("failed to create data directory: %v", err)
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

	log.Printf("Creating directory: %s using Alpine container", serverDataDir)
	log.Printf("Host data path: %s", m.dataPath)
	
	// Ensure base data directory exists
	if err := os.MkdirAll(m.dataPath, 0755); err != nil {
		log.Printf("Error creating base data directory: %v", err)
		return "", fmt.Errorf("failed to create base data directory: %v", err)
	}

	// Use alpine container to create directory
	serverName := strings.TrimPrefix(serverID, "mboxmini-")
	containerServerDir := filepath.Join("/data", serverName)
	mkdirCmd := fmt.Sprintf("mkdir -p %s", containerServerDir)
	log.Printf("Directory creation command: %s", mkdirCmd)

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
					Source: m.dataPath,
					Target: "/data",
				},
			},
		},
		nil,
		nil,
		"",
	)
	if err != nil {
		log.Printf("Error creating directory container: %v", err)
		log.Printf("Mount configuration - Source: %s, Target: %s", m.dataPath, "/data")
		return "", fmt.Errorf("failed to create directory container: %v", err)
	}

	log.Printf("Starting directory creation container with ID: %s", resp.ID)
	if err := m.client.ContainerStart(context.Background(), resp.ID, types.ContainerStartOptions{}); err != nil {
		log.Printf("Error starting directory container: %v", err)
		return "", fmt.Errorf("failed to start directory container: %v", err)
	}

	// Wait for container to finish
	log.Printf("Waiting for directory container to complete...")
	statusCh, errCh := m.client.ContainerWait(context.Background(), resp.ID, container.WaitConditionNotRunning)
	select {
	case err := <-errCh:
		if err != nil {
			log.Printf("Error waiting for directory container: %v", err)
			return "", fmt.Errorf("failed waiting for directory container: %v", err)
		}
	case status := <-statusCh:
		log.Printf("Directory container finished with status code: %d", status.StatusCode)
	}

	env := []string{
		"EULA=TRUE",
		fmt.Sprintf("VERSION=%s", version),
		"TYPE=VANILLA",
		fmt.Sprintf("MEMORY=%s", memory),
	}
	log.Printf("Minecraft container environment variables: %v", env)

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
	log.Printf("Listing Docker containers")
	
	containers, err := m.client.ContainerList(context.Background(), types.ContainerListOptions{
		All: true,
	})
	if err != nil {
		log.Printf("Error listing containers: %v", err)
		return nil, fmt.Errorf("failed to list containers: %v", err)
	}

	log.Printf("Found %d total containers", len(containers))

	var servers []ServerInfo
	for _, container := range containers {
		// Get container name without leading slash
		if len(container.Names) == 0 {
			continue
		}
		name := strings.TrimPrefix(container.Names[0], "/")
		
		// Skip containers that use MBoxMini application images
		if strings.HasPrefix(container.Image, "mboxmini-") {
			log.Printf("Skipping container %s: uses MBoxMini application image", name)
			continue
		}
		
		// Only include containers with mboxmini- prefix
		if !strings.HasPrefix(name, "mboxmini-") {
			log.Printf("Skipping container %s: not a Minecraft server", name)
			continue
		}
		
		log.Printf("Processing Minecraft server: %s", name)
		
		// Get port mapping
		port := 0
		for _, p := range container.Ports {
			if p.PrivatePort == 25565 {
				port = int(p.PublicPort)
				break
			}
		}
		log.Printf("Server port: %d", port)

		// Get server status
		status := "stopped"
		if container.State == "running" {
			status = "running"
		}

		// Get players if server is running
		var players []string
		if status == "running" {
			if playerList, err := m.GetServerPlayers(context.Background(), container.ID); err == nil {
				players = playerList
			} else {
				log.Printf("Error getting players for server %s: %v", name, err)
			}
		}

		serverInfo := ServerInfo{
			ID:      container.ID,
			Name:    strings.TrimPrefix(name, "mboxmini-"),
			Status:  status,
			Port:    port,
			Version: "latest", // We'll get the actual version later if needed
			Players: players,
		}
		log.Printf("Adding server: %+v", serverInfo)
		servers = append(servers, serverInfo)
	}

	log.Printf("Returning %d servers", len(servers))
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
		Name:    strings.TrimPrefix(strings.TrimPrefix(inspect.Name, "/"), "mboxmini-"),
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

func (m *Manager) ExecuteCommand(ctx context.Context, serverID string, command string) (string, error) {
	execConfig := types.ExecConfig{
		Cmd:          []string{"rcon-cli", command},
		AttachStdout: true,
		AttachStderr: true,
	}

	execID, err := m.client.ContainerExecCreate(ctx, serverID, execConfig)
	if err != nil {
		return "", fmt.Errorf("failed to create exec: %v", err)
	}

	resp, err := m.client.ContainerExecAttach(ctx, execID.ID, types.ExecStartCheck{})
	if err != nil {
		return "", fmt.Errorf("failed to attach to exec: %v", err)
	}
	defer resp.Close()

	// Read the output
	output, err := io.ReadAll(resp.Reader)
	if err != nil {
		return "", fmt.Errorf("failed to read exec output: %v", err)
	}

	// Get the exit code
	inspectResp, err := m.client.ContainerExecInspect(ctx, execID.ID)
	if err != nil {
		return "", fmt.Errorf("failed to inspect exec: %v", err)
	}

	if inspectResp.ExitCode != 0 {
		return "", fmt.Errorf("command failed with exit code %d", inspectResp.ExitCode)
	}

	return string(output), nil
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

func (m *Manager) DeleteServer(serverID string, removeFiles bool) error {
	log.Printf("Starting deletion process for server %s (removeFiles=%v)", serverID, removeFiles)

	// Get container info to get the name - we might need it for removing files
	inspect, err := m.client.ContainerInspect(context.Background(), serverID)
	if err != nil {
		log.Printf("Failed to inspect container %s: %v", serverID, err)
		return fmt.Errorf("failed to inspect container: %v", err)
	}
	// Get server name from container name - we might need it for removing files
	serverName := strings.TrimPrefix(inspect.Name, "/")

	// Stop the container first if it's running
	if err := m.StopServer(serverID); err != nil {
		log.Printf("Failed to stop server %s before deletion: %v", serverID, err)
		return fmt.Errorf("failed to stop server before deletion: %v", err)
	}
	log.Printf("Successfully stopped server %s", serverID)

	// Remove the container
	if err := m.client.ContainerRemove(context.Background(), serverID, types.ContainerRemoveOptions{
		Force: true,
	}); err != nil {
		log.Printf("Failed to remove container %s / %s: %v", serverName,serverID, err)
		return fmt.Errorf("failed to remove container: %v", err)
	}
	log.Printf("Successfully removed container %s %s", serverName, serverID)

	// Remove server files if requested
	if removeFiles {
		serverDataDir := filepath.Join(m.dataPath, serverName)
		log.Printf("Attempting to remove server files at %s", serverDataDir)
		if err := os.RemoveAll(serverDataDir); err != nil {
			log.Printf("Failed to remove server files at %s: %v", serverDataDir, err)
			return fmt.Errorf("failed to remove server files: %v", err)
		}
		log.Printf("Successfully removed server files at %s", serverDataDir)
	} else {
		log.Printf("Skipping server files removal as removeFiles=false")
	}

	// Remove port mapping
	m.mu.Lock()
	for port, id := range m.portInUse {
		if id == serverID {
			delete(m.portInUse, port)
			log.Printf("Removed port mapping for server %s (port %d)", serverID, port)
			break
		}
	}
	m.mu.Unlock()

	log.Printf("Server deletion completed successfully for %s", serverID)
	return nil
}

func (m *Manager) GetServerPlayers(ctx context.Context, serverID string) ([]string, error) {
	// Execute the list command
	output, err := m.ExecuteCommand(ctx, serverID, "list")
	if err != nil {
		return nil, fmt.Errorf("failed to execute list command: %v", err)
	}

	// Parse the output to extract player names
	// Expected format: "There are X of a max of Y players online: player1, player2, ..."
	// or "There are 0 of a max of Y players online."
	players := []string{}

	parts := strings.Split(output, ":")
	if len(parts) < 2 {
		// No players online
		return players, nil
	}

	// Get the player names part and split by commas
	playerList := strings.TrimSpace(parts[1])
	if playerList == "" {
		return players, nil
	}

	// Split player names and trim spaces
	for _, player := range strings.Split(playerList, ",") {
		name := strings.TrimSpace(player)
		if name != "" {
			players = append(players, name)
		}
	}

	return players, nil
}
