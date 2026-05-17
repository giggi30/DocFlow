import type { LoginResponse } from '../types/auth'

async function readAuthErrorDetail(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { detail?: string }
    if (typeof data?.detail === 'string') {
      return data.detail
    }
  } catch {
    return null
  }
  return null
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Login failed')
  }

  const data = (await response.json()) as LoginResponse
  if (!data.token || !data.companyName) {
    throw new Error('Invalid login response')
  }

  return data
}

export async function register(
  companyName: string,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch('/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ companyName, email, password }),
  })

  if (!response.ok) {
    const detail = await readAuthErrorDetail(response)
    throw new Error(detail ?? 'Register failed')
  }

  const data = (await response.json()) as LoginResponse
  if (!data.token || !data.companyName) {
    throw new Error('Invalid register response')
  }

  return data
}
