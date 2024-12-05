package handlers

import (
	"encoding/json"
	"mboxmini/api/docker"
	"net/http"
)

type ServerHandler struct {
	dockerManager *docker.Manager
}

func NewServerHandler(manager *docker.Manager) *ServerHandler {
	return &ServerHandler{
		dockerManager: manager,
	}
}

func (h *ServerHandler) StartServer(w http.ResponseWriter, r *http.Request) {
	if err := h.dockerManager.StartServer(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "started"})
}

func (h *ServerHandler) StopServer(w http.ResponseWriter, r *http.Request) {
	if err := h.dockerManager.StopServer(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "stopped"})
}

type CommandRequest struct {
	Command string `json:"command"`
}

func (h *ServerHandler) ExecuteCommand(w http.ResponseWriter, r *http.Request) {
	var cmd CommandRequest
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.dockerManager.ExecuteCommand(r.Context(), cmd.Command); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "command executed"})
}

type ServerConfigRequest struct {
	Properties map[string]string `json:"properties"`
}

func (h *ServerHandler) UpdateServerConfig(w http.ResponseWriter, r *http.Request) {
	var config ServerConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.dockerManager.UpdateServerProperties(r.Context(), config.Properties); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Restart server to apply changes
	if err := h.dockerManager.StopServer(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := h.dockerManager.StartServer(r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "configuration updated"})
}

func (h *ServerHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	status, err := h.dockerManager.GetServerStatus(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(status)
}

func (h *ServerHandler) GetPlayers(w http.ResponseWriter, r *http.Request) {
	players, err := h.dockerManager.GetOnlinePlayers(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"players": players,
	})
}
