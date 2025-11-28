import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AlertTriangle, Trash2, Info, HelpCircle, X } from 'lucide-react'
import { Button } from '@/components/common'

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'default'

interface ConfirmOptions {
  title: string
  message: string
  variant?: ConfirmVariant
  confirmText?: string
  cancelText?: string
  icon?: ReactNode
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  confirmDelete: (itemName: string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined)

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonVariant: 'danger' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    buttonVariant: 'primary' as const,
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonVariant: 'primary' as const,
  },
  default: {
    icon: HelpCircle,
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
    buttonVariant: 'primary' as const,
  },
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve: ((value: boolean) => void) | null
}

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'default',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    resolve: null,
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        variant: options.variant ?? 'default',
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        icon: options.icon,
        resolve,
      })
    })
  }, [])

  const confirmDelete = useCallback((itemName: string): Promise<boolean> => {
    return confirm({
      title: 'Eliminar',
      message: `¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    })
  }, [confirm])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }, [state.resolve])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }, [state.resolve])

  const config = variantConfig[state.variant ?? 'default']
  const Icon = state.icon ? () => <>{state.icon}</> : config.icon

  return (
    <ConfirmContext.Provider value={{ confirm, confirmDelete }}>
      {children}

      {/* Confirm Modal */}
      {state.isOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in"
          onClick={handleCancel}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Content */}
            <div className="p-6 sm:p-8">
              {/* Icon */}
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${config.iconBg} flex items-center justify-center mx-auto mb-4 sm:mb-5`}>
                <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${config.iconColor}`} />
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-2 sm:mb-3">
                {state.title}
              </h3>

              {/* Message */}
              <p className="text-gray-600 dark:text-gray-400 text-center text-sm sm:text-base leading-relaxed">
                {state.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 p-4 sm:p-6 pt-0 sm:pt-0">
              <Button
                variant="secondary"
                onClick={handleCancel}
                fullWidth
                className="sm:flex-1"
              >
                {state.cancelText}
              </Button>
              <Button
                variant={config.buttonVariant}
                onClick={handleConfirm}
                fullWidth
                className="sm:flex-1"
              >
                {state.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return context
}
