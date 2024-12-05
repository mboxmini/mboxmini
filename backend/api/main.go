package main

import (
	"log"
	"os"

	"mboxmini/backend/api/config"
	"mboxmini/backend/api/docker"
	"mboxmini/backend/api/handlers"
	"mboxmini/backend/api/middleware"

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

	// ... rest of the implementation
}
