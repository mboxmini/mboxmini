import { API_CONFIG, API_HEADERS } from './config';

export interface Server {
  id: string;
  name: string;
  status: string;
  version: string;
  port: number;
  players: string[];
}

export interface CreateServerRequest {
  name: string;
  version: string;
  memory?: string;
}

export const listServers = async (): Promise<Server[]> => {
  console.log('API: Attempting to fetch servers');
  console.log('API: Using headers:', API_HEADERS);
  console.log('API: Using URL:', `${API_CONFIG.API_URL}/api/servers`);

  try {
    const response = await fetch(`${API_CONFIG.API_URL}/api/servers`, {
      headers: API_HEADERS,
      mode: 'cors',
      credentials: 'omit',
    });

    console.log('API: Response status:', response.status);
    console.log('API: Response headers:', response.headers);

    return await response.json();
  } catch (error: unknown) {
    console.error('API: Error fetching servers:', error);
    if (error instanceof Error) {
      console.error('API: Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    return [];
  }
};

export const createServer = async (request: CreateServerRequest): Promise<string | null> => {
  try {
    const response = await fetch(`${API_CONFIG.API_URL}/api/servers`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(request),
    });
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error creating server:', error);
    return null;
  }
};

export const startServer = async (serverId: string): Promise<boolean> => {
  try {
    await fetch(`${API_CONFIG.API_URL}/api/servers/${serverId}/start`, {
      method: 'POST',
      headers: API_HEADERS,
    });
    return true;
  } catch (error) {
    console.error('Error starting server:', error);
    return false;
  }
};

export const stopServer = async (serverId: string): Promise<boolean> => {
  try {
    await fetch(`${API_CONFIG.API_URL}/api/servers/${serverId}/stop`, {
      method: 'POST',
      headers: API_HEADERS,
    });
    return true;
  } catch (error) {
    console.error('Error stopping server:', error);
    return false;
  }
};

export const getServerStatus = async (serverId: string): Promise<Server | null> => {
  try {
    const response = await fetch(`${API_CONFIG.API_URL}/api/servers/${serverId}`, {
      headers: API_HEADERS,
    });
    return await response.json();
  } catch (error) {
    console.error('Error getting server status:', error);
    return null;
  }
};

export const getServerPlayers = async (serverId: string): Promise<string[]> => {
  try {
    const response = await fetch(`${API_CONFIG.API_URL}/api/servers/${serverId}/players`, {
      headers: API_HEADERS,
    });
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error getting server players:', error);
    return [];
  }
};

export const executeCommand = async (serverId: string, command: string): Promise<boolean> => {
  try {
    await fetch(`${API_CONFIG.API_URL}/api/servers/${serverId}/command`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ command }),
    });
    return true;
  } catch (error) {
    console.error('Error executing command:', error);
    return false;
  }
};

export const deleteServer = async (serverId: string): Promise<boolean> => {
  try {
    await fetch(`${API_CONFIG.API_URL}/api/servers/${serverId}`, {
      method: 'DELETE',
      headers: API_HEADERS,
    });
    return true;
  } catch (error) {
    console.error('Error deleting server:', error);
    return false;
  }
};
