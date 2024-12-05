package middleware

import (
	"log"
	"net/http"
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
	requests map[string][]time.Time
	limit    int           // Number of requests
	window   time.Duration // Time window
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    100,              // 100 requests
		window:   time.Minute * 15, // per 15 minutes
	}
}

func (rl *RateLimiter) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr

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
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		// Add current request
		rl.requests[ip] = append(rl.requests[ip], now)

		next.ServeHTTP(w, r)
	})
}
