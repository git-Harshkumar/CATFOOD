import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = process.env.BACKEND_URL || env.BACKEND_URL || env.VITE_BACKEND_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
