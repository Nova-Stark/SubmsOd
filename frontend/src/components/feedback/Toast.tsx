import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      setToasts((prev) => [...prev, { id, message, type, title }])
      setTimeout(() => {
        removeToast(id)
      }, 4000)
    },
    [removeToast]
  )

  const success = useCallback((msg: string, title?: string) => showToast(msg, 'success', title), [showToast])
  const error = useCallback((msg: string, title?: string) => showToast(msg, 'error', title), [showToast])
  const info = useCallback((msg: string, title?: string) => showToast(msg, 'info', title), [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : t.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}

            <div className="flex-1 text-sm">
              {t.title && <div className="font-semibold mb-0.5">{t.title}</div>}
              <div>{t.message}</div>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
