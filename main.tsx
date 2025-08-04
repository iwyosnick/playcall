import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Validate required environment variables
// Temporarily commented out to test if app loads
// if (!process.env.GEMINI_API_KEY) {
//   throw new Error("GEMINI_API_KEY environment variable is required. Please set it in your .env.local file.");
// }

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
