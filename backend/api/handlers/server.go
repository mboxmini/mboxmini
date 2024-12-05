package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/mboxmini/mboxmini/backend/api/docker"
)

type ServerHandler struct {
	dockerManager *docker.Manager
}

func NewServerHandler(dm *docker.Manager) *ServerHandler {
	return &ServerHandler{
		dockerManager: dm,
	}
}

func (h *ServerHandler) RegisterRoutes(r *mux.Router) {
	// Create a subrouter for /api/server endpoints
	api := r.PathPrefix("/api/server").Subrouter()

	// Register routes with OPTIONS method
	api.HandleFunc("/start", h.StartServer).Methods("POST", "OPTIONS")
	api.HandleFunc("/stop", h.StopServer).Methods("POST", "OPTIONS")
	api.HandleFunc("/status", h.GetStatus).Methods("GET", "OPTIONS")
	api.HandleFunc("/command", h.ExecuteCommand).Methods("POST", "OPTIONS")
	api.HandleFunc("/players", h.ListPlayers).Methods("GET", "OPTIONS")
}

func (h *ServerHandler) StartServer(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Version string `json:"version"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Received request to start server with version: %s", req.Version)

	// Set environment variables for the container
	env := []string{
		"EULA=TRUE",
		fmt.Sprintf("VERSION=%s", req.Version),
		"TYPE=VANILLA",
		"MEMORY=2G",
	}

	log.Printf("Starting server with environment variables: %v", env)

	// Stop any existing container first
	if err := h.dockerManager.StopContainer(); err != nil {
		log.Printf("Warning: error stopping existing container: %v", err)
	}

	// Start new container with the specified version
	if err := h.dockerManager.StartContainer(env); err != nil {
		log.Printf("Error starting container: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully started server with version %s", req.Version)
	json.NewEncoder(w).Encode(map[string]string{"status": "started"})
}

func (h *ServerHandler) StopServer(w http.ResponseWriter, r *http.Request) {
	if err := h.dockerManager.StopContainer(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": "stopped"})
}

func (h *ServerHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	status, err := h.dockerManager.GetContainerStatus()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": status})
}

func (h *ServerHandler) ExecuteCommand(w http.ResponseWriter, r *http.Request) {
	var cmd struct {
		Command string `json:"command"`
	}
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.dockerManager.ExecuteCommand(r.Context(), cmd.Command); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "command executed"})
}

func (h *ServerHandler) ListPlayers(w http.ResponseWriter, r *http.Request) {
	players, err := h.dockerManager.ListPlayers()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"players": players})
}
