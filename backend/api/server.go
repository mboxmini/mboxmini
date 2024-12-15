package main

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/willroberts/minecraft-client"
)

type ExecuteCommandRequest struct {
	Command string `json:"command"`
}

type ExecuteCommandResponse struct {
	Response string `json:"response,omitempty"`
	Error    string `json:"error,omitempty"`
}

// ExecuteCommand executes an RCON command on the server
func (h *Handler) ExecuteCommand(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	serverId := vars["id"]

	var req ExecuteCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	server, err := h.manager.GetServer(serverId)
	if err != nil {
		http.Error(w, "Server not found", http.StatusNotFound)
		return
	}

	if server.Status != "running" {
		http.Error(w, "Server must be running to execute commands", http.StatusBadRequest)
		return
	}

	// Connect to RCON
	client, err := minecraft.NewClient("localhost", server.RconPort)
	if err != nil {
		http.Error(w, "Failed to connect to RCON", http.StatusInternalServerError)
		return
	}
	defer client.Close()

	// Authenticate with RCON
	err = client.Authenticate(server.RconPassword)
	if err != nil {
		http.Error(w, "Failed to authenticate with RCON", http.StatusInternalServerError)
		return
	}

	// Execute the command
	response, err := client.SendCommand(req.Command)
	if err != nil {
		http.Error(w, "Failed to execute command", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ExecuteCommandResponse{
		Response: response,
	})
}

// RegisterRoutes registers the server routes
func (h *Handler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/servers/{id}/execute", h.ExecuteCommand).Methods("POST", "OPTIONS")
}