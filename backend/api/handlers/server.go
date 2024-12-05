package handlers

import (
	"encoding/json"
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
	r.HandleFunc("/api/server/start", h.StartServer).Methods("POST")
	r.HandleFunc("/api/server/stop", h.StopServer).Methods("POST")
	r.HandleFunc("/api/server/status", h.GetStatus).Methods("GET")
	r.HandleFunc("/api/server/command", h.ExecuteCommand).Methods("POST")
	r.HandleFunc("/api/server/players", h.ListPlayers).Methods("GET")
}

func (h *ServerHandler) StartServer(w http.ResponseWriter, r *http.Request) {
	if err := h.dockerManager.StartContainer(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
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
