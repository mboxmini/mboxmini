package middleware

import (
	"log"
	"net/http"
)

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("CORS: Incoming request: Method=%s, URL=%s, Origin=%s", 
			r.Method, r.URL.Path, r.Header.Get("Origin"))

		// Always set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			log.Printf("CORS: Handling OPTIONS preflight request for path: %s", r.URL.Path)
			w.WriteHeader(http.StatusOK)
			return
		}

		// For non-OPTIONS requests, proceed with the request
		next.ServeHTTP(w, r)
	})
}
