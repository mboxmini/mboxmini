export const API_CONFIG = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  API_KEY: process.env.REACT_APP_API_KEY || '',
  MINECRAFT_PORT: process.env.REACT_APP_MINECRAFT_PORT || '25565',
};

if (!API_CONFIG.API_KEY) {
  console.error('API_KEY is not set in environment variables');
}

export const API_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_CONFIG.API_KEY}`,
};
