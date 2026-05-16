export type AuthSession = {
  token: string
  companyName: string
}

const STORAGE_KEY = 'docflow.auth'
const BOOT_STORAGE_KEY = 'docflow.boot'

export function loadSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const data = JSON.parse(raw) as AuthSession
    if (!data?.token || !data?.companyName) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return data
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveSession(session: AuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY)
}

export function loadBootId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(BOOT_STORAGE_KEY)
}

export function saveBootId(bootId: string) {
  window.localStorage.setItem(BOOT_STORAGE_KEY, bootId)
}

export function clearBootId() {
  window.localStorage.removeItem(BOOT_STORAGE_KEY)
}

export function getAuthToken(): string | null {
  return loadSession()?.token ?? null
}

export const AUTH_STORAGE_KEY = STORAGE_KEY
export const BOOT_ID_STORAGE_KEY = BOOT_STORAGE_KEY
