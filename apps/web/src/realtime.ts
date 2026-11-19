import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { Capacitor } from '@capacitor/core'

type EchoClient = InstanceType<typeof Echo>

let echo: EchoClient | null = null

function apiBase(): string {
  const configured = import.meta.env.VITE_API_URL
  if (configured) return configured.replace(/\/$/, '')
  if (Capacitor.isNativePlatform()) return 'http://10.0.2.2:8000'
  return ''
}

export function realtime(): EchoClient | null {
  if (echo) return echo

  const key = import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_REVERB_KEY
  if (!key) return null

  const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname
  const port = Number(import.meta.env.VITE_REVERB_PORT || 8080)
  const scheme = (import.meta.env.VITE_REVERB_SCHEME || 'http') as string
  const forceTLS = scheme === 'https'

  window.Pusher = Pusher

  echo = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBase() || ''}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('tebyar_token') || ''}`,
        Accept: 'application/json',
      },
    },
  })

  return echo
}

export function disconnectRealtime(): void {
  if (echo) {
    echo.disconnect()
    echo = null
  }
}

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}