package handlers

import (
	"encoding/json"
	"log"
	"net/http"

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

func NewServerHandler(dm *docker.Manager) *ServerHandler {
	return &ServerHandler{
		dockerManager: dm,
	}
}

func (h *ServerHandler) RegisterRoutes(r *mux.Router) {
	api := r.PathPrefix("/api/servers").Subrouter()

	api.HandleFunc("", h.ListServers).Methods("GET", "OPTIONS")
	api.HandleFunc("", h.CreateServer).Methods("POST", "OPTIONS")
	api.HandleFunc("/{id}", h.GetServerStatus).Methods("GET", "OPTIONS")
	api.HandleFunc("/{id}/start", h.StartServer).Methods("POST", "OPTIONS")
	api.HandleFunc("/{id}/stop", h.StopServer).Methods("POST", "OPTIONS")
	api.HandleFunc("/{id}/command", h.ExecuteCommand).Methods("POST", "OPTIONS")
}

func (h *ServerHandler) ListServers(w http.ResponseWriter, r *http.Request) {
	servers, err := h.dockerManager.ListServers()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
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

	if err := h.dockerManager.ExecuteCommand(r.Context(), serverID, cmd.Command); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "command executed"})
}
