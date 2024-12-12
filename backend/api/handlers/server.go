package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"github.com/mboxmini/mboxmini/backend/api/docker"
)

type ServerHandler struct {
	dockerManager *docker.Manager
}

type CreateServerRequest struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Memory  string `json:"memory,omitempty"`
}

type ServerResponse struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Status  string   `json:"status"`
	Version string   `json:"version"`
	Players []string `json:"players"`
}

type CommandRequest struct {
	Command string `json:"command"`
}

type DeleteServerRequest struct {
	RemoveFiles bool `json:"remove_files"`
}

func NewServerHandler(dm *docker.Manager) *ServerHandler {
	return &ServerHandler{
		dockerManager: dm,
	}
}

func (h *ServerHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/servers", h.ListServers).Methods("GET", "OPTIONS")
	r.HandleFunc("/servers", h.CreateServer).Methods("POST", "OPTIONS")
	r.HandleFunc("/servers/{id}", h.GetServerStatus).Methods("GET", "OPTIONS")
	r.HandleFunc("/servers/{id}", h.DeleteServer).Methods("DELETE", "OPTIONS")
	r.HandleFunc("/servers/{id}/start", h.StartServer).Methods("POST", "OPTIONS")
	r.HandleFunc("/servers/{id}/stop", h.StopServer).Methods("POST", "OPTIONS")
	r.HandleFunc("/servers/{id}/command", h.ExecuteCommand).Methods("POST", "OPTIONS")
	r.HandleFunc("/servers/{id}/players", h.GetPlayers).Methods("GET", "OPTIONS")
}

func (h *ServerHandler) ListServers(w http.ResponseWriter, r *http.Request) {
	log.Printf("Received request to list servers")
	
	servers, err := h.dockerManager.ListServers()
	if err != nil {
		log.Printf("Error listing servers: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Found %d servers", len(servers))
	for i, server := range servers {
		log.Printf("Server %d: ID=%s, Name=%s, Status=%s", i+1, server.ID, server.Name, server.Status)
	}

	json.NewEncoder(w).Encode(servers)
}

func (h *ServerHandler) CreateServer(w http.ResponseWriter, r *http.Request) {
	log.Printf("Received create server request")

	var req CreateServerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("Decoded request: %+v", req)

	if req.Name == "" || req.Version == "" {
		log.Printf("Invalid request: name or version is empty")
		http.Error(w, "Name and version are required", http.StatusBadRequest)
		return
	}

	serverID, err := h.dockerManager.CreateServer(req.Name, req.Version, req.Memory)
	if err != nil {
		log.Printf("Error creating server: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("Server created successfully with ID: %s", serverID)

	json.NewEncoder(w).Encode(map[string]string{"id": serverID})
}

func (h *ServerHandler) GetServerStatus(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["id"]
	if serverID == "" {
		http.Error(w, "Server ID is required", http.StatusBadRequest)
		return
	}

	status, err := h.dockerManager.GetServerStatus(serverID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(status)
}

func (h *ServerHandler) StartServer(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["id"]
	if serverID == "" {
		http.Error(w, "Server ID is required", http.StatusBadRequest)
		return
	}

	if err := h.dockerManager.StartServer(serverID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "started"})
}

func (h *ServerHandler) StopServer(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["id"]
	if serverID == "" {
		http.Error(w, "Server ID is required", http.StatusBadRequest)
		return
	}

	if err := h.dockerManager.StopServer(serverID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "stopped"})
}

func (h *ServerHandler) ExecuteCommand(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["id"]
	if serverID == "" {
		http.Error(w, "Server ID is required", http.StatusBadRequest)
		return
	}

	var cmd CommandRequest
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	output, err := h.dockerManager.ExecuteCommand(r.Context(), serverID, cmd.Command)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Check if output contains error messages
	if strings.Contains(output, "Unknown or incomplete command") ||
		strings.Contains(output, "Invalid command") ||
		strings.Contains(output, "Error:") {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "error",
			"error":  output,
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"status": "success",
		"output": output,
	})
}

func (h *ServerHandler) DeleteServer(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["id"]
	if serverID == "" {
		http.Error(w, "Server ID is required", http.StatusBadRequest)
		return
	}

	var req DeleteServerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// If no body is provided, default to not removing files
		log.Printf("No request body provided or error decoding, defaulting removeFiles to false: %v", err)
		req.RemoveFiles = false
	}

	log.Printf("Deleting server %s with removeFiles=%v", serverID, req.RemoveFiles)

	if err := h.dockerManager.DeleteServer(serverID, req.RemoveFiles); err != nil {
		log.Printf("Error deleting server %s: %v", serverID, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully deleted server %s", serverID)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func (h *ServerHandler) GetPlayers(w http.ResponseWriter, r *http.Request) {
	serverID := mux.Vars(r)["id"]
	if serverID == "" {
		http.Error(w, "Server ID is required", http.StatusBadRequest)
		return
	}

	// First check if server exists and is running
	status, err := h.dockerManager.GetServerStatus(serverID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if status.Status != "running" {
		// Return empty list if server is not running
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]string{})
		return
	}

	// Execute the list command to get current players
	players, err := h.dockerManager.GetServerPlayers(r.Context(), serverID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(players)
}
