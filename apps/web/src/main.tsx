import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { AuthProvider } from './auth'
import App from './App'
import './tebyar.css'
import './index.css'

const savedTheme = localStorage.getItem('tebyar_theme')
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light'

if (Capacitor.isNativePlatform()) {
  void import('@capacitor/push-notifications').then(async ({ PushNotifications }) => {
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') return
    await PushNotifications.register()
    await PushNotifications.addListener('registration', (token) => {
      const auth = localStorage.getItem('tebyar_token')
      if (!auth) return
      const base = import.meta.env.VITE_API_URL || 'http://10.0.2.2:8000'
      void fetch(`${base}/api/v1/devices`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify({ token: token.value, platform: 'android' }),
      })
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
