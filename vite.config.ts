import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In a GitHub Codespace, the dev server is reached through the *.app.github.dev
// forwarded URL, never directly via localhost. Bind to all interfaces, declare
// the forwarded host trusted, and route HMR websockets through the public
// domain on port 443.
const codespaceHost = process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-3100.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
  : null;

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  server: {
    host: true,
    port: 3100,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    hmr: codespaceHost
      ? { host: codespaceHost, protocol: 'wss', clientPort: 443 }
      : { host: 'localhost' },
    allowedHosts: codespaceHost ? [codespaceHost] : undefined,
  },
});
