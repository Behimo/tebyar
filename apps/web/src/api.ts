import { Capacitor } from '@capacitor/core'
import type { QuotaItem } from './types'

export class ApiError extends Error {
  status: number
  code?: string
  quota?: QuotaItem

  constructor(message: string, status: number, code?: string, quota?: QuotaItem) {
    super(message)
    this.status = status
    this.code = code
    this.quota = quota
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

  const controller = new AbortController()
  const timeoutMs = init.body instanceof FormData ? 60000 : 15000
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  return fetch(`${base}/api/v1${path}`, { ...init, headers, signal: init.signal ?? controller.signal })
    .then(async (response) => {
      window.clearTimeout(timer)
      const text = await response.text()
      let data: { message?: string; code?: string; quota?: QuotaItem; errors?: Record<string, string[]> } | null = null
      if (text) {
        try {
          data = JSON.parse(text) as { message?: string; code?: string; quota?: QuotaItem; errors?: Record<string, string[]> }
        } catch {
          data = null
        }
      }
      if (!response.ok) {
        const details = data?.errors ? Object.values(data.errors).flat().join(' ') : ''
        const fallback =
          response.status === 502 || response.status === 503
            ? 'سرور API روشن نیست. در ترمینال: cd apps\\api سپس php artisan serve --host=0.0.0.0 --port=8000'
            : 'خطایی رخ داد.'
        const message = details || data?.message || fallback
        if (response.status === 402) {
          window.dispatchEvent(new CustomEvent('tebyar:upgrade', { detail: { message, quota: data?.quota } }))
        }
        throw new ApiError(message, response.status, data?.code, data?.quota)
      }
      return data as T
    })
    .catch((reason) => {
      window.clearTimeout(timer)
      if (reason instanceof ApiError) throw reason
      if (reason instanceof DOMException && reason.name === 'AbortError') {
        throw new ApiError('پاسخ سرور بیش از حد طول کشید. لطفاً دوباره تلاش کنید.', 408)
      }
      throw new ApiError(
        'اتصال به سرور برقرار نشد. Vite و php artisan serve هر دو باید روشن باشند.',
        0,
      )
    })
}

/** مسیر رسانه را به مبدأ درست وصل می‌کند: وب از همان origin، اپ از VITE_API_URL */
export function assetUrl(url?: string | null, width?: number): string | undefined {
  if (!url) return undefined
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const withWidth = (path: string) => width ? `${path}${path.includes('?') ? '&' : '?'}width=${width}` : path
  const mediaPath = (path: string) => {
    if (path.startsWith('/storage/')) return `/api/v1/media${path.slice('/storage'.length)}`
    if (path.startsWith('/api/v1/media/')) return path
    return null
  }
  const local = mediaPath(url)
  if (local) return `${base}${withWidth(local)}`
  try {
    const remote = mediaPath(new URL(url).pathname)
    if (remote) return `${base}${withWidth(remote)}`
  } catch {
    return url
  }
  return url
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
