package main

import (
	"log"
	"net/http"
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

	// Initialize Docker manager
	dockerManager, err := docker.NewManager(
		cfg.ContainerName,
		cfg.DockerImage,
		cfg.DataVolumePath,
		1024,
	)
	if err != nil {
		log.Fatal(err)
	}

	// Initialize handlers
	serverHandler := handlers.NewServerHandler(dockerManager)

	// Initialize router
	r := mux.NewRouter()

	// Add middleware to all routes
	r.Use(middleware.CORS)
	r.Use(middleware.Logging)
	r.Use(rateLimiter.RateLimit)
	r.Use(apiKey.Authenticate)

	// Register routes
	serverHandler.RegisterRoutes(r)

	// Start server
	log.Printf("Starting server on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal(err)
	}
}
