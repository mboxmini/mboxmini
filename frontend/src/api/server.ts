import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const API_KEY = process.env.REACT_APP_API_KEY || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export const getServerStatus = () => {
  return api.get('/api/server/status');
};

export const startServer = () => {
  return api.post('/api/server/start');
};

export const stopServer = () => {
  return api.post('/api/server/stop');
};

export const executeCommand = (command: string) => {
  return api.post('/api/server/command', { command });
};

export const getPlayers = () => {
  return api.get('/api/server/players');
};
