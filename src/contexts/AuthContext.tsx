'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthResult {
  error?: { message: string } | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  signInWithProvider: (provider: string) => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  signInWithProvider: async () => ({}),
  resetPassword: async () => ({}),
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: { message: error.message } }
    return {}
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName?: string): Promise<AuthResult> => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) return { error: { message: error.message } }
    return {}
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
  }, [])

  const signInWithProvider = useCallback(async (provider: string): Promise<AuthResult> => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as 'google' | 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) return { error: { message: error.message } }
    return {}
  }, [])

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    if (error) return { error: { message: error.message } }
    return {}
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, signInWithProvider, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
