package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/mboxmini/mboxmini/backend/api/database"
)

type AuthMiddleware struct {
	db        *database.DB
	jwtSecret []byte
}

type UserContext struct {
	ID       int64
	Username string
}

func NewAuthMiddleware(db *database.DB, jwtSecret string) *AuthMiddleware {
	return &AuthMiddleware{
		db:        db,
		jwtSecret: []byte(jwtSecret),
	}
}

func (a *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		authType := strings.ToLower(parts[0])
		token := parts[1]

		var userCtx *UserContext
		var err error

		switch authType {
		case "bearer":
			userCtx, err = a.validateJWT(token)
		case "apikey":
			userCtx, err = a.validateAPIKey(token)
		default:
			http.Error(w, "Invalid authorization type", http.StatusUnauthorized)
			return
		}

		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		if userCtx == nil {
			http.Error(w, "Authentication failed", http.StatusUnauthorized)
			return
		}

		// Add user context to request
		ctx := context.WithValue(r.Context(), "user", userCtx)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *AuthMiddleware) validateJWT(tokenString string) (*UserContext, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return a.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, jwt.ErrInvalidKey
	}

	userID := int64(claims["user_id"].(float64))
	username := claims["username"].(string)

	return &UserContext{
		ID:       userID,
		Username: username,
	}, nil
}

func (a *AuthMiddleware) validateAPIKey(apiKey string) (*UserContext, error) {
	user, err := a.db.GetUserByAPIKey(apiKey)
	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, nil
	}

	return &UserContext{
		ID:       user.ID,
		Username: user.Username,
	}, nil
}

// Helper function to get user context from request
func GetUserFromContext(ctx context.Context) *UserContext {
	user, ok := ctx.Value("user").(*UserContext)
	if !ok {
		return nil
	}
	return user
}
