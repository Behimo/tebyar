import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from './api'
import type { Me } from './types'

type AuthValue = {
  user: Me | null
  loading: boolean
  setSession: (token: string, user: Me) => void
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const token = localStorage.getItem('tebyar_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const payload = await api<{ data: Me }>('/me')
      setUser(payload.data)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) localStorage.removeItem('tebyar_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    setSession: (token, next) => {
      localStorage.setItem('tebyar_token', token)
      setUser(next)
    },
    refresh,
    logout: async () => {
      try {
        await api('/auth/logout', { method: 'POST' })
      } catch {
        /* the local session still ends */
      }
      localStorage.removeItem('tebyar_token')
      setUser(null)
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('auth')
  return value
}
