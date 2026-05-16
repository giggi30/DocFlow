import type { LoginResponse } from '../types/auth'

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
