import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from './api'
import { disconnectRealtime, realtime } from './realtime'
import { writeCache } from './cache'
import type { Me } from './types'

type AuthValue = {
  user: Me | null
  loading: boolean
  setSession: (token: string, user: Me) => void
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)
const meKey = 'tebyar_me'

function readMe(): Me | null {
  try {
    const raw = sessionStorage.getItem(meKey)
    return raw ? JSON.parse(raw) as Me : null
  } catch {
    return null
  }
}

function storeMe(next: Me | null) {
  if (next) sessionStorage.setItem(meKey, JSON.stringify(next))
  else sessionStorage.removeItem(meKey)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const tokenAtStart = localStorage.getItem('tebyar_token')
  const cached = tokenAtStart ? readMe() : null
  const [user, setUser] = useState<Me | null>(cached)
  const [loading, setLoading] = useState(Boolean(tokenAtStart) && !cached)

  const refresh = async () => {
    const token = localStorage.getItem('tebyar_token')
    if (!token) {
      storeMe(null)
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const payload = await api<{ data: Me }>('/me')
      storeMe(payload.data)
      setUser(payload.data)
      if (payload.data.account_status === 'verified' && payload.data.role !== 'employer') {
        void api<{ data: unknown }>('/conversations').then((p) => writeCache('tebyar-conversations', p.data)).catch(() => undefined)
        void api<{ data: unknown }>('/communities').then((p) => writeCache('tebyar-communities', p.data)).catch(() => undefined)
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem('tebyar_token')
        storeMe(null)
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    if (user?.account_status === 'verified' && user.role !== 'employer') realtime()
    else disconnectRealtime()
  }, [user?.id, user?.account_status, user?.role])

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    setSession: (token, next) => {
      localStorage.setItem('tebyar_token', token)
      storeMe(next)
      setUser(next)
      setLoading(false)
    },
    refresh,
    logout: async () => {
      try {
        await api('/auth/logout', { method: 'POST' })
      } catch {
        /* the local session still ends */
      }
      localStorage.removeItem('tebyar_token')
      storeMe(null)
      setUser(null)
      disconnectRealtime()
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('auth')
  return value
}
