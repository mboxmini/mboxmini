import { axiosInstance } from "@/providers/axios";
import { Server, CreateServerRequest } from "@/interfaces";

interface DeleteServerOptions {
  deleteFiles: boolean;
}

export const getServers = async (): Promise<Server[]> => {
  const { data } = await axiosInstance.get("/api/servers");
  return data;
};

export const createServer = async (request: CreateServerRequest): Promise<string> => {
  const { data } = await axiosInstance.post("/api/servers", request);
  return data.id;
};

export const startServer = async (id: string): Promise<void> => {
  await axiosInstance.post(`/api/servers/${id}/start`);
};

export const stopServer = async (id: string): Promise<void> => {
  await axiosInstance.post(`/api/servers/${id}/stop`);
};

export const deleteServer = async (id: string, options: DeleteServerOptions): Promise<void> => {
  await axiosInstance.delete(`/api/servers/${id}`, {
    data: { remove_files: options.deleteFiles },
  });
};

export const executeCommand = async (
  serverId: string,
  command: string
): Promise<{ response?: string; error?: string }> => {
  const { data } = await axiosInstance.post(`/api/servers/${serverId}/execute`, {
    command,
  });
  return data;
};

export const getServerPlayers = async (serverId: string): Promise<string[]> => {
  const { data } = await axiosInstance.get(`/api/servers/${serverId}/players`);
  return data;
}; 