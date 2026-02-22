"use client"
import { createContext, useContext, useState, useCallback } from 'react'

type Toast = { id: string; title?: string; description?: string; type?: 'success' | 'error' | 'info' }

const ToastContext = createContext<{ push: (t: Omit<Toast, 'id'>) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((s) => [...s, { id, ...t }])
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-80">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-[90vw] w-full p-3 rounded shadow ${t.type === 'error' ? 'bg-red-600 text-white' : 'bg-white text-gray-900'}`}>
            {t.title && <div className="font-semibold">{t.title}</div>}
            {t.description && <div className="text-sm">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
