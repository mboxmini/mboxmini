import { API_CONFIG, API_HEADERS } from './config';

let listServersTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_DELAY = 1000; // 1 second

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

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '10';
        const retryMs = parseInt(retryAfter) * 1000;
        console.log(`Rate limited. Retrying after ${retryMs}ms`);

        // Return empty array and let the component retry after delay
        return [];
      }
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching servers:', error);
    return [];
  }
};

// Debounced version of listServers
export const debouncedListServers = async (): Promise<Server[]> => {
  if (listServersTimeout) {
    clearTimeout(listServersTimeout);
  }

  return new Promise(resolve => {
    listServersTimeout = setTimeout(async () => {
      const servers = await listServers();
      resolve(servers);
    }, DEBOUNCE_DELAY);
  });
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
    console.log('Fetching status for server:', serverId);
    const response = await fetch(`${API_CONFIG.API_URL}/api/servers/${serverId}`, {
      headers: API_HEADERS,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Server ${serverId} not found`);
        return null;
      }
      throw new Error(`Server returned ${response.status}`);
    }

    // Get response as text first
    const text = await response.text();
    console.log('Raw response:', text);

    try {
      // Try to parse as JSON regardless of content type
      const data = JSON.parse(text);
      console.log('Parsed server data:', data);
      return data;
    } catch (parseError) {
      console.error('Failed to parse server response:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error getting server status:', error);
    return null;
  }
};

export const getServerPlayers = async (serverId: string): Promise<string[]> => {
  try {
    // First check if server exists
    const serverStatus = await getServerStatus(serverId);
    if (!serverStatus) {
      console.log(`Not fetching players for non-existent server ${serverId}`);
      return [];
    }

    const response = await fetch(`${API_CONFIG.API_URL}/api/servers/${serverId}/players`, {
      headers: API_HEADERS,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Server ${serverId} not found while fetching players`);
        return [];
      }
      throw new Error(`Server returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type:', contentType);
      return [];
    }

    const text = await response.text();
    if (!text) {
      return [];
    }

    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return data;
      } else if (data.error) {
        console.error('Server error:', data.error);
        return [];
      }
      return [];
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError, 'Response text:', text);
      return [];
    }
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

export const updateServer = async (serverId: string, version: string, memory: string) => {
  try {
    const response = await fetch(`${API_CONFIG.API_URL}/api/servers/${serverId}/update`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ version, memory }),
    });

    if (!response.ok) {
      throw new Error('Failed to update server');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating server:', error);
    throw error;
  }
};
