import type { AuthProvider } from "@refinedev/core";
import { axiosInstance } from "@/providers/axios";

const TOKEN_KEY = "mboxmini_token";
const API_KEY = "mboxmini_api_key";

interface AuthResponse {
  token: string;
  api_key: string;
  message: string;
}

interface LoginParams {
  username: string;
  password: string;
}

interface RegisterParams {
  username: string;
  password: string;
}

export const authProvider: AuthProvider = {
  login: async ({ username, password }: LoginParams) => {
    try {
      const { data } = await axiosInstance.post<AuthResponse>("/api/auth/login", {
        username,
        password,
      });

      // Store both JWT token and API key
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(API_KEY, data.api_key);

      // Update axios default headers
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

      return {
        success: true,
        redirectTo: "/",
      };
    } catch (error: any) {
      const message = error.response?.data?.message || "Login failed";
      return {
        success: false,
        error: {
          message,
          name: "Invalid credentials",
        },
      };
    }
  },

  register: async ({ username, password }: RegisterParams) => {
    try {
      const { data } = await axiosInstance.post<AuthResponse>("/api/auth/register", {
        username,
        password,
      });

      // Store both JWT token and API key
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(API_KEY, data.api_key);

      // Update axios default headers
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

      return {
        success: true,
        redirectTo: "/",
      };
    } catch (error: any) {
      const message = error.response?.data?.message || "Registration failed";
      return {
        success: false,
        error: {
          message,
          name: "Registration Error",
        },
      };
    }
  },

  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(API_KEY);
    
    // Clear authorization header
    delete axiosInstance.defaults.headers.common["Authorization"];

    return {
      success: true,
      redirectTo: "/login",
    };
  },

  onError: async (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return {
        logout: true,
        redirectTo: "/login",
        error: {
          message: "Session expired, please login again",
          name: "Authentication Error",
        },
      };
    }
    return { error };
  },

  check: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return {
        authenticated: false,
        error: {
          message: "Please login to continue",
          name: "Authentication Required",
        },
        logout: true,
        redirectTo: "/login",
      };
    }

    // Set authorization header
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    return {
      authenticated: true,
    };
  },

  getIdentity: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    // Decode JWT token to get user info
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));

    return {
      id: payload.user_id,
      name: payload.username,
    };
  },

  getPermissions: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }
    return ["authenticated"];
  },
};
