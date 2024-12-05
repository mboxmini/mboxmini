package middleware

import (
	"net/http"
	"sync"
	"time"
)

type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.Mutex
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
	}
}

func (rl *RateLimiter) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		rl.mu.Lock()
		now := time.Now()
		// Clean old requests
		if times, exists := rl.requests[ip]; exists {
			var valid []time.Time
			for _, t := range times {
				if now.Sub(t) < time.Minute {
					valid = append(valid, t)
				}
			}
			rl.requests[ip] = valid
		}

		// Check rate limit (100 requests per minute)
		if len(rl.requests[ip]) >= 100 {
			rl.mu.Unlock()
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		rl.requests[ip] = append(rl.requests[ip], now)
		rl.mu.Unlock()

		next.ServeHTTP(w, r)
	})
}

type APIKey struct {
	Key string
}

func (a *APIKey) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := r.Header.Get("X-API-Key")
		if key != a.Key {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
