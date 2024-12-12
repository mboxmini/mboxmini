package main

import (
	"log"
	"net/http"
	"os"

	"github.com/mboxmini/mboxmini/backend/api/database"
	"github.com/mboxmini/mboxmini/backend/api/docker"
	"github.com/mboxmini/mboxmini/backend/api/handlers"
	"github.com/mboxmini/mboxmini/backend/api/middleware"

	"github.com/gorilla/mux"
)

func main() {
	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is not set")
	}

	// Initialize database
	db, err := database.New("mboxmini.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Initialize middleware
	rateLimiter := middleware.NewRateLimiter()
	authMiddleware := middleware.NewAuthMiddleware(db, jwtSecret)

	// Initialize Docker manager
	dataPath := os.Getenv("DATA_PATH")
	manager, err := docker.NewManager(dataPath, 25565, 25665)
	if err != nil {
		log.Fatal(err)
	}

	// Initialize handlers
	serverHandler := handlers.NewServerHandler(manager)
	authHandler := handlers.NewAuthHandler(db, jwtSecret)
	adminHandler := handlers.NewAdminHandler(db)

	// Initialize router
	r := mux.NewRouter()

	// Apply CORS middleware to the root router
	r.Use(middleware.CORS)

	// Public endpoints (no auth required)
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET", "OPTIONS")

	// Auth endpoints (no auth required)
	r.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST", "OPTIONS")

	// Protected API routes
	api := r.PathPrefix("/api").Subrouter()
	api.Use(authMiddleware.Authenticate)
	api.Use(rateLimiter.RateLimit)

	// Register routes
	serverHandler.RegisterRoutes(api)
	adminHandler.RegisterRoutes(api)

	// Start server
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
