package middleware

import (
	"log"
	"net/http"
	"sync"
	"time"
)

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Log the request
		log.Printf(
			"Started %s %s from %s",
			r.Method,
			r.URL.Path,
			r.RemoteAddr,
		)

		next.ServeHTTP(w, r)

		// Log the response time
		log.Printf(
			"Completed %s %s in %v",
			r.Method,
			r.URL.Path,
			time.Since(start),
		)
	})
}

type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int           // Number of requests
	window   time.Duration // Time window
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    1000,             // 1000 requests
		window:   time.Minute * 5,  // per 5 minutes
	}
}

func (rl *RateLimiter) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

		rl.mu.Lock()
		// Clean old requests
		now := time.Now()
		if times, exists := rl.requests[ip]; exists {
			var valid []time.Time
			for _, t := range times {
				if now.Sub(t) <= rl.window {
					valid = append(valid, t)
				}
			}
			rl.requests[ip] = valid
		}

		// Check rate limit
		if len(rl.requests[ip]) >= rl.limit {
			rl.mu.Unlock()
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		// Add current request
		rl.requests[ip] = append(rl.requests[ip], now)
		rl.mu.Unlock()

		next.ServeHTTP(w, r)
	})
}
