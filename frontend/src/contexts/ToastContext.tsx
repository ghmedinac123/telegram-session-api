import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const toastConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-800 dark:text-green-100',
    messageColor: 'text-green-700 dark:text-green-200',
    progressColor: 'bg-green-500',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-300 dark:border-red-700',
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-800 dark:text-red-100',
    messageColor: 'text-red-700 dark:text-red-200',
    progressColor: 'bg-red-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-800 dark:text-blue-100',
    messageColor: 'text-blue-700 dark:text-blue-200',
    progressColor: 'bg-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    titleColor: 'text-yellow-800 dark:text-yellow-100',
    messageColor: 'text-yellow-700 dark:text-yellow-200',
    progressColor: 'bg-yellow-500',
  },
}

interface ToastItemProps {
  toast: Toast
  onRemove: () => void
}

const ToastItem = ({ toast, onRemove }: ToastItemProps) => {
  const config = toastConfig[toast.type]
  const Icon = config.icon
  const duration = toast.duration ?? 5000

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-sm
        ${config.bg} ${config.border}
        animate-slide-in-right
        transform transition-all duration-300 ease-out
        overflow-hidden
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
      <div className="flex-1 min-w-0 pr-2">
        <p className={`font-semibold text-sm ${config.titleColor}`}>{toast.title}</p>
        {toast.message && (
          <p className={`text-sm mt-0.5 ${config.messageColor}`}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
          <div
            className={`h-full ${config.progressColor} animate-shrink-width`}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  )
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const duration = toast.duration ?? 5000

    setToasts((prev) => {
      // Limit to 5 toasts max
      const limited = prev.length >= 5 ? prev.slice(1) : prev
      return [...limited, { ...toast, id, duration }]
    })

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message, duration: 4000 })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    // Para errores de servidor, mostrar mensaje genérico
    const safeMessage = message?.toLowerCase().includes('server') ||
                        message?.toLowerCase().includes('500') ||
                        message?.toLowerCase().includes('network')
      ? undefined
      : message
    addToast({ type: 'error', title, message: safeMessage, duration: 6000 })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message, duration: 4000 })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message, duration: 5000 })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}

      {/* Toast Container - TOP RIGHT */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm sm:max-w-md pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
