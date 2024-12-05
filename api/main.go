package main

import (
	"log"
	"mboxmini/api/config"
	"mboxmini/api/docker"
	"mboxmini/api/handlers"
	"mboxmini/api/middleware"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

func main() {
	cfg := config.NewDefaultConfig()

	// Get API key from environment
	apiKeyValue := os.Getenv("API_KEY")
	if apiKeyValue == "" {
		log.Fatal("API_KEY environment variable is not set")
	}

	// Initialize middleware
	rateLimiter := middleware.NewRateLimiter()
	apiKey := &middleware.APIKey{Key: apiKeyValue}

	dockerManager, err := docker.NewManager(
		cfg.ContainerName,
		cfg.DockerImage,
		cfg.DataVolumePath,
		1024,
	)
	if err != nil {
		log.Fatal(err)
	}

	serverHandler := handlers.NewServerHandler(dockerManager)

	r := mux.NewRouter()

	// Add middleware to all routes
	r.Use(middleware.Logging)
	r.Use(rateLimiter.RateLimit)
	r.Use(apiKey.Authenticate)

	// Server management endpoints
	r.HandleFunc("/api/server/start", serverHandler.StartServer).Methods("POST")
	r.HandleFunc("/api/server/stop", serverHandler.StopServer).Methods("POST")
	r.HandleFunc("/api/server/command", serverHandler.ExecuteCommand).Methods("POST")
	r.HandleFunc("/api/server/status", serverHandler.GetStatus).Methods("GET")
	r.HandleFunc("/api/server/players", serverHandler.GetPlayers).Methods("GET")
	r.HandleFunc("/api/server/config", serverHandler.UpdateServerConfig).Methods("POST")

	log.Printf("Server starting on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal(err)
	}
}
