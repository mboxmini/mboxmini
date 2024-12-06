from flask import request, jsonify
from functools import wraps
import time
from collections import defaultdict

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.max_requests = 30  # Increased from default
        self.time_window = 10  # Window in seconds, increased from default

    def is_rate_limited(self, ip):
        now = time.time()
        self.requests[ip] = [req_time for req_time in self.requests[ip] 
                           if now - req_time < self.time_window]
        
        if len(self.requests[ip]) >= self.max_requests:
            return True
            
        self.requests[ip].append(now)
        return False

    def rate_limit(self, f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = request.remote_addr
            
            if self.is_rate_limited(ip):
                response = jsonify({
                    'error': 'Rate limit exceeded',
                    'retry_after': self.time_window
                })
                response.headers['Retry-After'] = str(self.time_window)
                return response, 429
                
            return f(*args, **kwargs)
            
        return decorated_function 