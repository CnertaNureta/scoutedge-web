'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface User {
  id: string
  email?: string
  user_metadata?: { display_name?: string }
}

interface AuthResult {
  error?: { message: string } | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  signInWithProvider: (provider: string) => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  signInWithProvider: async () => ({}),
  resetPassword: async () => ({}),
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('scoutedge-user')
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // invalid data
    }
    setLoading(false)
  }, [])

  const signIn = async (_email: string, _password: string): Promise<AuthResult> => {
    return { error: { message: 'Auth not configured yet. Coming soon.' } }
  }

  const signUp = async (_email: string, _password: string, _displayName?: string): Promise<AuthResult> => {
    return { error: { message: 'Auth not configured yet. Coming soon.' } }
  }

  const signOut = async () => {
    localStorage.removeItem('scoutedge-user')
    setUser(null)
  }

  const signInWithProvider = async (_provider: string): Promise<AuthResult> => {
    return { error: { message: 'OAuth not configured yet. Coming soon.' } }
  }

  const resetPassword = async (_email: string): Promise<AuthResult> => {
    return { error: { message: 'Password reset not configured yet. Coming soon.' } }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithProvider, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
