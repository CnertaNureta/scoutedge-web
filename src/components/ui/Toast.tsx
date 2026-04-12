'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastVariant = 'success' | 'info' | 'warning' | 'destructive'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

const VARIANT_BORDER: Record<ToastVariant, string> = {
  success: 'border-l-2 border-l-primary',
  info: 'border-l-2 border-l-on-surface-variant',
  warning: 'border-l-2 border-l-tertiary',
  destructive: 'border-l-2 border-l-secondary',
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col-reverse gap-3 max-md:bottom-20 max-md:left-4 max-md:right-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass-panel rounded-xl px-4 py-3 shadow-lg min-w-[280px] max-w-[400px] animate-fade-in-up ${VARIANT_BORDER[t.variant]}`}
          >
            <p className="font-body text-sm text-on-surface">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
