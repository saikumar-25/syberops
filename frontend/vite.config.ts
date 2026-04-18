import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // In dev, proxy to local backend. VITE_API_URL is only set for production builds.
  const backendHttp = env.VITE_API_URL || 'http://localhost:3001';
  const backendWs  = env.VITE_WS_URL  || 'ws://localhost:3001';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendHttp,
          changeOrigin: true,
        },
        '/ws': {
          target: backendWs,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
