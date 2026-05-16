import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { login as loginRequest } from '../api/auth'
import {
  AUTH_STORAGE_KEY,
  clearSession,
  loadBootId,
  loadSession,
  saveBootId,
  saveSession,
  type AuthSession,
} from '../auth/session'
import { AuthContext } from './authContext'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession())
  const [isReady, setIsReady] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password)
    const nextSession = { token: data.token, companyName: data.companyName }
    saveSession(nextSession)
    setSession(nextSession)
    return nextSession
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    const syncBootId = async () => {
      try {
        const response = await fetch('/health', { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Health failed')
        }
        const data = (await response.json()) as { bootId?: string }
        const bootId = typeof data?.bootId === 'string' ? data.bootId : null
        if (!isActive) {
          return
        }
        if (bootId) {
          const storedBootId = loadBootId()
          if (storedBootId && storedBootId !== bootId) {
            clearSession()
            setSession(null)
          }
          saveBootId(bootId)
        }
      } catch {
        if (!isActive) {
          return
        }
      } finally {
        if (isActive) {
          setIsReady(true)
        }
      }
    }

    syncBootId()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== AUTH_STORAGE_KEY) {
        return
      }
      setSession(loadSession())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      isReady,
      login,
      logout,
    }),
    [session, isReady, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
