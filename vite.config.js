import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load every env var (no prefix filter) so we can reuse API_GATEWAY for the proxy.
  const env = loadEnv(mode, process.cwd(), '')
  const gateway = (env.API_GATEWAY || 'https://employee-gateway.bangsat.online/').replace(/\/$/, '')

  return {
    plugins: [vue()],
    // Expose `API_`-prefixed env vars (e.g. API_GATEWAY) to client code,
    // in addition to Vite's default `VITE_` prefix.
    envPrefix: ['VITE_', 'API_'],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Dev-only proxy: the gateway has no CORS headers, so we call it via a
      // same-origin path and let Vite forward the request server-side.
      proxy: {
        '/api-gateway': {
          target: gateway,
          changeOrigin: true,
          secure: true,
          rewrite: () => '/',
        },
      },
    },
  }
})
