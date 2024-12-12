import type { AuthProvider } from "@refinedev/core";

// Simple API key authentication
const API_KEY = import.meta.env.VITE_API_KEY || "development"; // Use VITE_API_KEY
const TOKEN_KEY = "mboxmini_token";

// Log the API key being used (for debugging)
console.log('Using API key:', API_KEY);

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    // For development, accept any credentials and use the API key
    localStorage.setItem(TOKEN_KEY, API_KEY);
    return {
      success: true,
      redirectTo: "/",
    };
  },

  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  onError: async (error) => {
    if (error.response?.status === 401) {
      return {
        logout: true,
      };
    }
    return { error };
  },

  check: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      error: {
        message: "Authentication failed",
        name: "Token not found",
      },
      logout: true,
      redirectTo: "/login",
    };
  },

  getIdentity: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    return {
      id: 1,
      name: "Admin",
      email: "admin@example.com",
    };
  },
};
