package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/mboxmini/mboxmini/backend/api/database"
)

type AdminHandler struct {
	db *database.DB
}

func NewAdminHandler(db *database.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

func (h *AdminHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/admin/users", h.ListUsers).Methods("GET", "OPTIONS")
	r.HandleFunc("/admin/users", h.CreateUser).Methods("POST", "OPTIONS")
	r.HandleFunc("/admin/users/{id}", h.DeleteUser).Methods("DELETE", "OPTIONS")
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	log.Printf("Listing users")
	users, err := h.db.ListUsers()
	if err != nil {
		log.Printf("Error listing users: %v", err)
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}

	// Convert to safe user objects (without sensitive data)
	safeUsers := make([]map[string]interface{}, len(users))
	for i, user := range users {
		safeUsers[i] = map[string]interface{}{
			"_id":       user.ID,
			"email":     user.Username, // Using username as email
			"createdAt": user.CreatedAt,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(safeUsers)
}

func (h *AdminHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate input
	if input.Email == "" || input.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	user, err := h.db.CreateUser(input.Email, input.Password)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "User created successfully",
		"_id":     user.ID,
		"email":   user.Username,
	})
}

func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["id"]

	// Convert string ID to int64
	id, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := h.db.DeleteUser(id); err != nil {
		log.Printf("Error deleting user: %v", err)
		http.Error(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User deleted successfully",
	})
}
