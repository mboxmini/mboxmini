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
	dataPath := os.Getenv("DATA_PATH")
	manager, err := docker.NewManager(dataPath, 25565, 25575)
	if err != nil {
		log.Fatal(err)
	}

	// Initialize handlers
	serverHandler := handlers.NewServerHandler(manager)

	// Initialize router
	r := mux.NewRouter()

	// Apply CORS middleware to the root router
	r.Use(middleware.CORS)

	// Add health check endpoint (no auth required)
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET", "OPTIONS")

	// Add middleware to API routes
	api := r.PathPrefix("/api").Subrouter()
	api.Use(middleware.Logging)
	api.Use(rateLimiter.RateLimit)
	api.Use(apiKey.Authenticate)

	// Register routes
	serverHandler.RegisterRoutes(api)

	// Add OPTIONS handler for all routes
	r.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	})

	// Start server
	log.Printf("Starting server on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal(err)
	}
}
