import { createContext } from 'react'
import type { AuthSession } from '../auth/session'

export type AuthContextValue = {
  session: AuthSession | null
  isAuthenticated: boolean
  isReady: boolean
  login: (email: string, password: string) => Promise<AuthSession>
  register: (
    companyName: string,
    email: string,
    password: string,
  ) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
