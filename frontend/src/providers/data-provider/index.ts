import { DataProvider } from "@refinedev/core";
import { axiosInstance } from "@/providers/axios";

// Get the API URL from environment variable or construct it from window.location
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const port = import.meta.env.VITE_API_PORT || '8080';
  return `http://${window.location.hostname}:${port}`;
};

const API_URL = getApiUrl();

export const dataProvider: DataProvider = {
  getList: async ({ resource }) => {
    const url = `${API_URL}/api/${resource}`;
    const { data } = await axiosInstance.get(url);

    return {
      data,
      total: data.length,
    };
  },

  getOne: async ({ resource, id }) => {
    const url = `${API_URL}/api/${resource}/${id}`;
    const { data } = await axiosInstance.get(url);

    return {
      data,
    };
  },

  create: async ({ resource, variables }) => {
    const url = `${API_URL}/api/${resource}`;
    const { data } = await axiosInstance.post(url, variables);

    return {
      data,
    };
  },

  update: async ({ resource, id, variables }) => {
    const url = `${API_URL}/api/${resource}/${id}/update`;
    const { data } = await axiosInstance.post(url, variables);

    return {
      data,
    };
  },

  deleteOne: async ({ resource, id, variables }) => {
    const url = `${API_URL}/api/${resource}/${id}`;
    const { data } = await axiosInstance.delete(url, { data: variables });

    return {
      data,
    };
  },

  custom: async ({ url, method, payload }) => {
    const response = await axiosInstance({
      method,
      url: `${API_URL}/api${url}`,
      data: payload,
    });

    return {
      data: response.data,
    };
  },

  getApiUrl: () => `${API_URL}/api`,
};
