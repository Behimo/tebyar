import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.tebyar.ir',
  appName: 'طبیار',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
