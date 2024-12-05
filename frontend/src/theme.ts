import { ThemeConfig } from 'antd/es/config-provider';

export const theme: ThemeConfig = {
  token: {
    // Gen Z/Alpha-friendly color palette
    colorPrimary: '#FF3366', // Vibrant pink
    colorSuccess: '#00E676', // Neon green
    colorWarning: '#FFD600', // Bright yellow
    colorError: '#FF3D71', // Coral red
    colorInfo: '#00B0FF', // Electric blue

    // Modern, rounded corners
    borderRadius: 12,

    // Larger, more readable font
    fontSize: 16,

    // Wider spacing for better readability
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,

    // Softer shadows for depth
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    boxShadowSecondary: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      paddingContentHorizontal: 24,
    },
    Card: {
      borderRadius: 16,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
  },
};

// Custom colors for styled-components
export const colors = {
  background: '#1A1A2E', // Deep blue-black
  surface: '#232344', // Slightly lighter blue
  accent1: '#FF3366', // Vibrant pink
  accent2: '#00E676', // Neon green
  accent3: '#00B0FF', // Electric blue
  text: '#FFFFFF', // White
  textSecondary: '#B3B3CC', // Light gray
  border: '#363663', // Subtle border
  gradient: 'linear-gradient(135deg, #FF3366 0%, #FF6B98 100%)', // Pink gradient
};

// Breakpoints for responsive design
export const breakpoints = {
  xs: '320px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
  xxl: '1600px',
};
