export interface Server {
  id: string;
  name: string;
  status: string;
  version: string;
  port: number;
  players: string[];
  type: string;
  memory: string;
  image: string;
  env: Record<string, string>;
}

export interface CreateServerRequest {
  name: string;
  version: string;
  memory?: string;
}

export interface CommandResponse {
  status: 'success' | 'error';
  output?: string;
  error?: string;
} 