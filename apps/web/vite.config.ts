import { networkInterfaces } from 'node:os'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function localLanIp(): string | undefined {
  for (const interfaces of Object.values(networkInterfaces())) {
    if (!interfaces) continue
    for (const iface of interfaces) {
      const isV4 = String(iface.family) === 'IPv4'
      if (isV4 && !iface.internal) return iface.address
    }
  }
  return undefined
}

const lanIp = process.env.VITE_HMR_HOST || localLanIp()

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'طبیار',
        short_name: 'طبیار',
        description: 'شبکه اجتماعی پزشکان',
        lang: 'fa',
        dir: 'rtl',
        display: 'standalone',
        background_color: '#E8E6EE',
        theme_color: '#12A8A8',
        start_url: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  ...(lanIp ? { hmr: { host: lanIp, port: 5173 } } : {}),
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/storage': 'http://127.0.0.1:8000',
    },
  },
})
