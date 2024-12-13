import axios from "axios";

const TOKEN_KEY = "mboxmini_token";

// Get the API URL from environment variable or construct it from window.location
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const port = import.meta.env.VITE_API_PORT || '8080';
  return `http://${window.location.hostname}:${port}`;
};

const API_URL = getApiUrl();

export const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Rate limiting
      if (error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || '10';
        const retryMs = parseInt(retryAfter) * 1000;
        console.log(`Rate limited. Retrying after ${retryMs}ms`);
      }
      
      // Log the error details
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    }
    return Promise.reject(error);
  }
);
