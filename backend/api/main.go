package main

import (
	"log"
	"os"

	"github.com/mboxmini/mboxmini/backend/api/config"
	"github.com/mboxmini/mboxmini/backend/api/docker"
	"github.com/mboxmini/mboxmini/backend/api/handlers"
	"github.com/mboxmini/mboxmini/backend/api/middleware"

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
