'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthButton() {
  const { user, loading, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-surface-container-high animate-pulse" />
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label font-bold text-sm tracking-tight hover:brightness-110 active:scale-[0.98] transition-all"
      >
        Sign In
      </Link>
    )
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm hover:bg-primary/30 transition-colors"
        aria-label="User menu"
      >
        {initials}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-xl border border-white/[0.08] shadow-2xl py-2 z-50">
          <div className="px-4 py-2.5 border-b border-white/[0.06]">
            <p className="text-sm font-bold text-on-surface truncate">{displayName}</p>
            <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
          </div>

          <button
            onClick={async () => {
              setMenuOpen(false)
              await signOut()
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-on-surface-variant hover:text-red-400 hover:bg-white/[0.04] transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
