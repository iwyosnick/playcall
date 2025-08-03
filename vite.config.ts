import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Validate required environment variables
    if (!env.GEMINI_API_KEY) {
        console.warn('Warning: GEMINI_API_KEY environment variable is not set. The app may not function properly.');
    }
    
    return {
      build: {
        outDir: 'dist',
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html')
          },
          external: ['react', 'react-dom', '@google/genai'],
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              ai: ['@google/genai']
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.NODE_ENV': JSON.stringify(mode)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        exclude: ['react', 'react-dom', '@google/genai']
      },
      // Add security headers for development
      server: {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        }
      }
    };
});
