import { useState } from 'react'
import { Modal, Button, Input, Alert } from '@/components/common'
import { useVerifyCode } from '@/hooks'
import { ApiException } from '@/types'
import { MessageSquare } from 'lucide-react'

interface VerifySMSModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  phoneNumber: string
  onSuccess: () => void
}

export const VerifySMSModal = ({
  isOpen,
  onClose,
  sessionId,
  phoneNumber,
  onSuccess,
}: VerifySMSModalProps) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const verifyCode = useVerifyCode()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code || code.length < 5) {
      setError('El código debe tener al menos 5 dígitos')
      return
    }

    try {
      await verifyCode.mutateAsync({ sessionId, code })
      setCode('')
      onSuccess()
      onClose()
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message)
      } else {
        setError('Error al verificar el código')
      }
    }
  }

  const handleClose = () => {
    setCode('')
    setError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Verificar Código SMS"
      size="sm"
    >
      <div className="p-6">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>

        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Hemos enviado un código de verificación a{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{phoneNumber}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          <Input
            label="Código de Verificación"
            type="text"
            placeholder="12345"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
            disabled={verifyCode.isPending}
            autoFocus
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={verifyCode.isPending}
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={verifyCode.isPending}
              fullWidth
            >
              Verificar
            </Button>
          </div>
        </form>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          ¿No recibiste el código? Espera un momento y revisa tus mensajes de Telegram.
        </p>
      </div>
    </Modal>
  )
}
