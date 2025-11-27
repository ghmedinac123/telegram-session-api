import { ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

interface AlertProps {
  children: ReactNode
  variant?: 'info' | 'success' | 'warning' | 'error'
  className?: string
}

export const Alert = ({ children, variant = 'info', className = '' }: AlertProps) => {
  const variants = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-100',
      icon: Info,
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100',
      icon: CheckCircle,
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      icon: AlertCircle,
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      icon: XCircle,
    },
  }

  const { bg, text, icon: Icon } = variants[variant]

  return (
    <div className={`p-4 rounded-lg border ${bg} ${text} flex items-start gap-3 ${className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  )
}
