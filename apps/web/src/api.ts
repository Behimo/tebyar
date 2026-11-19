import { Capacitor } from '@capacitor/core'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const base = import.meta.env.VITE_API_URL
  || (Capacitor.isNativePlatform() ? 'http://10.0.2.2:8000' : '')

export function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('tebyar_token')
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${base}/api/v1${path}`, { ...init, headers }).then(async (response) => {
    const text = await response.text()
    const data = text ? JSON.parse(text) as { message?: string; errors?: Record<string, string[]> } : null
    if (!response.ok) {
      const details = data?.errors ? Object.values(data.errors).flat().join(' ') : ''
      throw new ApiError(details || data?.message || 'خطایی رخ داد.', response.status)
    }
    return data as T
  })
}

export function when(iso?: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
