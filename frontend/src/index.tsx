import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import { ThemeProvider } from 'styled-components';
import App from './App';
import { theme, colors, breakpoints } from './theme';

import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={{ colors, breakpoints }}>
      <ConfigProvider theme={theme}>
        <App />
      </ConfigProvider>
    </ThemeProvider>
  </React.StrictMode>
); 