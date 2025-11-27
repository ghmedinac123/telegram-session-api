import { useState } from 'react'
import { Plus, Loader2, AlertCircle, Smartphone, Activity } from 'lucide-react'
import { Layout } from '@/components/layout'
import { Button, Alert, Card } from '@/components/common'
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

  // Stats
  const totalSessions = sessions?.length || 0
  const activeSessions = sessions?.filter((s) => s.is_active).length || 0
  const pendingSessions = sessions?.filter((s) => !s.is_active && s.auth_state !== 'failed').length || 0

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestiona tus sesiones de Telegram
            </p>
          </div>
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Sesion
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <Smartphone className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sesiones</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalSessions}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Activas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeSessions}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingSessions}</p>
            </div>
          </Card>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="error">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Error al cargar las sesiones. Intenta nuevamente.</span>
            </div>
          </Alert>
        )}

        {/* Empty State */}
        {sessions && sessions.length === 0 && (
          <Card className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
              <Smartphone className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay sesiones
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Crea tu primera sesion de Telegram para comenzar a enviar mensajes
            </p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Sesion
            </Button>
          </Card>
        )}

        {/* Sessions List */}
        {sessions && sessions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sesiones ({sessions.length})
            </h2>
            <div className="grid gap-4">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
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
