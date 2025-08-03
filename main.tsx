import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Validate required environment variables
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is required. Please set it in your .env.local file.");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
