import axios from 'axios';
import { API_CONFIG } from './config';

interface ServerStatus {
    status: string;
}

interface PlayersResponse {
    players: string[];
}

interface CommandResponse {
    status: string;
}

interface StartServerRequest {
    version: string;
}

const api = axios.create({
    baseURL: API_CONFIG.API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.API_KEY}`
    }
});

export const getServerStatus = async (): Promise<ServerStatus> => {
    try {
        const response = await api.get<ServerStatus>('/api/server/status');
        return response.data;
    } catch (error) {
        console.error('Error fetching server status:', error);
        return { status: 'error' };
    }
};

export const startServer = async (version: string): Promise<ServerStatus> => {
    try {
        const response = await api.post<ServerStatus>('/api/server/start', { version });
        return response.data;
    } catch (error) {
        console.error('Error starting server:', error);
        return { status: 'error' };
    }
};

export const stopServer = async (): Promise<ServerStatus> => {
    try {
        const response = await api.post<ServerStatus>('/api/server/stop');
        return response.data;
    } catch (error) {
        console.error('Error stopping server:', error);
        return { status: 'error' };
    }
};

export const executeCommand = async (command: string): Promise<CommandResponse> => {
    try {
        const response = await api.post<CommandResponse>('/api/server/command', { command });
        return response.data;
    } catch (error) {
        console.error('Error executing command:', error);
        return { status: 'error' };
    }
};

export const getPlayers = async (): Promise<PlayersResponse> => {
    try {
        const response = await api.get<PlayersResponse>('/api/server/players');
        return response.data;
    } catch (error) {
        console.error('Error fetching players:', error);
        return { players: [] };
    }
};
