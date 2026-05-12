'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Link } from '@/i18n/navigation'

interface DropdownItem {
  label: string
  href: string
}

export default function NavDropdown({
  label,
  items,
}: {
  label: string
  items: DropdownItem[]
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuId = useId()

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => () => clearCloseTimer(), [])

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        clearCloseTimer()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-headline font-bold tracking-tight text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 opacity-50 transition-all ${open ? 'rotate-180 opacity-100' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute top-full left-1/2 z-50 -translate-x-1/2 pt-2"
          role="menu"
        >
          <div className="glass-panel rounded-xl border border-white/[0.08] shadow-2xl py-2 min-w-[200px]">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-5 py-2.5 font-label text-sm text-on-surface-variant hover:text-primary hover:bg-white/[0.04] transition-colors"
                role="menuitem"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
