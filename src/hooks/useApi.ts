import { useAuth } from '@/contexts/AuthContext'
import { useCallback } from 'react'

export function useApi() {
  const { session } = useAuth()

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> ?? {}),
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const res = await fetch(path, { ...options, headers })
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error ?? `Request failed with status ${res.status}`)
    }

    return data
  }, [session])

  return { apiFetch, isAuthenticated: !!session }
}
