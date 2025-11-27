import { useEffect, useState } from 'react'
import { Modal, Alert, Button } from '@/components/common'
import { useSession } from '@/hooks'
import { QrCode, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  qrImage: string
  onSuccess: () => void
}

export const QRCodeModal = ({
  isOpen,
  onClose,
  sessionId,
  qrImage: initialQrImage,
  onSuccess,
}: QRCodeModalProps) => {
  const [qrImage, setQrImage] = useState(initialQrImage)
  const [attempt, setAttempt] = useState(1)
  const [status, setStatus] = useState<'waiting' | 'success' | 'failed'>('waiting')

  // Polling para verificar si el QR fue escaneado
  const { data: sessionData, refetch } = useSession(sessionId)

  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(async () => {
      const result = await refetch()

      if (result.data?.session.is_active) {
        setStatus('success')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
        clearInterval(interval)
      }
    }, 3000) // Polling cada 3 segundos

    return () => clearInterval(interval)
  }, [isOpen, sessionId, refetch, onSuccess, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={status === 'waiting' ? onClose : () => {}}
      title="Escanea el Código QR"
      size="md"
      showClose={status === 'waiting'}
    >
      <div className="p-6">
        {status === 'waiting' && (
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-64 h-64 bg-white p-4 rounded-xl shadow-lg">
                  <img
                    src={`data:image/png;base64,${qrImage}`}
                    alt="QR Code"
                    className="w-full h-full"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary-600 text-white rounded-full p-2">
                  <QrCode className="w-6 h-6" />
                </div>
              </div>
            </div>

            <Alert variant="info">
              <div className="space-y-2">
                <p className="font-semibold text-sm">Cómo escanear:</p>
                <ol className="text-sm space-y-1 ml-4 list-decimal">
                  <li>Abre Telegram en tu teléfono</li>
                  <li>Ve a Configuración → Dispositivos → Vincular Dispositivo de Escritorio</li>
                  <li>Escanea este código QR</li>
                </ol>
              </div>
            </Alert>

            <div className="flex items-center justify-center gap-2 mt-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Esperando escaneo... (Intento {attempt}/3)
              </span>
            </div>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
              El código se regenerará automáticamente si expira
            </p>
          </>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              ¡Sesión Creada!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Tu sesión de Telegram está activa y lista para usar
            </p>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Error al Crear Sesión
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Se alcanzó el límite de intentos. Por favor, intenta de nuevo.
            </p>
            <Button variant="primary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
