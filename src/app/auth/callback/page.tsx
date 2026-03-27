'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/')
      }
    })
  }, [router])

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="glass-hero-card rounded-2xl border border-white/[0.06] p-8 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-on-surface-variant text-sm">Completing sign in...</p>
      </div>
    </div>
  )
}
