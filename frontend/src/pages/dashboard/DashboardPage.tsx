import { useState } from 'react'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { Layout } from '@/components/layout'
import { Button, Alert } from '@/components/common'
import { useSessions } from '@/hooks'
import { SessionCard } from './components/SessionCard'
import { CreateSessionModal, VerifySMSModal, QRCodeModal } from '@/components/sessions'

export const DashboardPage = () => {
  const { data: sessions, isLoading, error, refetch } = useSessions()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showVerifySMS, setShowVerifySMS] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)

  const [currentSession, setCurrentSession] = useState<{
    id: string
    phone?: string
    qr?: string
  } | null>(null)

  const handleCreateSuccess = (sessionId: string, response: any) => {
    setShowCreateModal(false)

    if (response.phone_code_hash) {
      // Flujo SMS
      setCurrentSession({ id: sessionId, phone: response.session.phone_number })
      setShowVerifySMS(true)
    } else if (response.qr_image_base64) {
      // Flujo QR
      setCurrentSession({ id: sessionId, qr: response.qr_image_base64 })
      setShowQRCode(true)
    }
  }

  const handleVerifySuccess = () => {
    setShowVerifySMS(false)
    setCurrentSession(null)
    refetch()
  }

  const handleQRSuccess = () => {
    setShowQRCode(false)
    setCurrentSession(null)
    refetch()
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Sesiones de Telegram
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestiona tus sesiones activas
            </p>
          </div>
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4" />
            Nueva Sesión
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        )}

        {error && (
          <Alert variant="error">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Error al cargar las sesiones. Intenta nuevamente.</span>
            </div>
          </Alert>
        )}

        {sessions && sessions.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay sesiones
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crea tu primera sesión de Telegram para comenzar
            </p>
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2 inline" />
              Crear Sesión
            </Button>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}

        {/* Modals */}
        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />

        {currentSession && showVerifySMS && (
          <VerifySMSModal
            isOpen={showVerifySMS}
            onClose={() => setShowVerifySMS(false)}
            sessionId={currentSession.id}
            phoneNumber={currentSession.phone || ''}
            onSuccess={handleVerifySuccess}
          />
        )}

        {currentSession && showQRCode && (
          <QRCodeModal
            isOpen={showQRCode}
            onClose={() => setShowQRCode(false)}
            sessionId={currentSession.id}
            qrImage={currentSession.qr || ''}
            onSuccess={handleQRSuccess}
          />
        )}
      </div>
    </Layout>
  )
}
