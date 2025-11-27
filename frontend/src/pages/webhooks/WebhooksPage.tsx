import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Webhook,
  Play,
  Square,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Link as LinkIcon,
  Shield,
  RefreshCw,
} from 'lucide-react'
import { Layout } from '@/components/layout'
import { Button, Alert, Card, Input, Modal } from '@/components/common'
import { useSession } from '@/hooks'
import { useToast } from '@/contexts'
import { WEBHOOK_EVENTS } from '@/config/constants'
import {
  getWebhookConfig,
  createWebhook,
  deleteWebhook,
  startWebhook,
  stopWebhook,
  WebhookConfig,
  WebhookCreateRequest,
} from '@/api/webhooks.api'

export const WebhooksPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: session, isLoading: sessionLoading } = useSession(sessionId!)

  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActing, setIsActing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState<WebhookCreateRequest>({
    url: '',
    events: [],
    secret: '',
    timeout_ms: 5000,
    max_retries: 3,
  })

  useEffect(() => {
    if (sessionId) {
      loadWebhookConfig()
    }
  }, [sessionId])

  const loadWebhookConfig = async () => {
    try {
      setIsLoading(true)
      const config = await getWebhookConfig(sessionId!)
      setWebhookConfig(config)
    } catch (error) {
      // No hay webhook configurado
      setWebhookConfig(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateWebhook = async () => {
    if (!formData.url) {
      toast.error('Error', 'La URL es requerida')
      return
    }

    try {
      setIsActing(true)
      await createWebhook(sessionId!, formData)
      toast.success('Webhook creado', 'El webhook ha sido configurado correctamente')
      setShowCreateModal(false)
      loadWebhookConfig()
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo crear el webhook')
    } finally {
      setIsActing(false)
    }
  }

  const handleDeleteWebhook = async () => {
    if (!confirm('Estas seguro de eliminar el webhook?')) return

    try {
      setIsActing(true)
      await deleteWebhook(sessionId!)
      toast.success('Webhook eliminado', 'El webhook ha sido eliminado')
      setWebhookConfig(null)
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo eliminar el webhook')
    } finally {
      setIsActing(false)
    }
  }

  const handleStartWebhook = async () => {
    try {
      setIsActing(true)
      await startWebhook(sessionId!)
      toast.success('Webhook iniciado', 'El webhook esta escuchando eventos')
      loadWebhookConfig()
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo iniciar el webhook')
    } finally {
      setIsActing(false)
    }
  }

  const handleStopWebhook = async () => {
    try {
      setIsActing(true)
      await stopWebhook(sessionId!)
      toast.success('Webhook detenido', 'El webhook ha dejado de escuchar')
      loadWebhookConfig()
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo detener el webhook')
    } finally {
      setIsActing(false)
    }
  }

  const toggleEvent = (eventId: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events?.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...(prev.events || []), eventId],
    }))
  }

  if (!sessionId) {
    return (
      <Layout>
        <Alert variant="error">ID de sesion no valido</Alert>
      </Layout>
    )
  }

  if (sessionLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!session) {
    return (
      <Layout>
        <Alert variant="error">Sesion no encontrada</Alert>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {session.session.session_name} - Recibe eventos en tiempo real
              </p>
            </div>
          </div>

          {!webhookConfig && (
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Configurar Webhook
            </Button>
          )}
        </div>

        {/* Webhook Config Card */}
        {webhookConfig ? (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${webhookConfig.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <Webhook className={`w-6 h-6 ${webhookConfig.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Webhook Configurado</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      webhookConfig.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {webhookConfig.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Activo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Inactivo
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {webhookConfig.is_active ? (
                  <Button
                    variant="secondary"
                    onClick={handleStopWebhook}
                    isLoading={isActing}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Detener
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleStartWebhook}
                    isLoading={isActing}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={handleDeleteWebhook}
                  isLoading={isActing}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Config details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <LinkIcon className="w-4 h-4" />
                  URL
                </div>
                <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                  {webhookConfig.url}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Shield className="w-4 h-4" />
                  Secret
                </div>
                <p className="font-mono text-sm text-gray-900 dark:text-white">
                  {webhookConfig.secret ? '••••••••' : 'No configurado'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Clock className="w-4 h-4" />
                  Timeout
                </div>
                <p className="text-sm text-gray-900 dark:text-white">
                  {webhookConfig.timeout_ms}ms
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <RefreshCw className="w-4 h-4" />
                  Reintentos
                </div>
                <p className="text-sm text-gray-900 dark:text-white">
                  {webhookConfig.max_retries} intentos
                </p>
              </div>
            </div>

            {/* Events */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Eventos suscritos
              </h4>
              <div className="flex flex-wrap gap-2">
                {webhookConfig.events?.map((event) => (
                  <span
                    key={event}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-sm font-medium"
                  >
                    {event}
                  </span>
                ))}
              </div>
            </div>

            {/* Last error */}
            {webhookConfig.last_error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Ultimo error
                </div>
                <p className="text-sm text-red-600 dark:text-red-300">
                  {webhookConfig.last_error}
                </p>
                {webhookConfig.last_error_at && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    {new Date(webhookConfig.last_error_at).toLocaleString('es-ES')}
                  </p>
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Webhook className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay webhook configurado
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Configura un webhook para recibir eventos de Telegram en tiempo real
            </p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Configurar Webhook
            </Button>
          </Card>
        )}

        {/* Events info */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Eventos disponibles
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {WEBHOOK_EVENTS.map((event) => (
              <div
                key={event.id}
                className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {event.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {event.id}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Configurar Webhook"
        size="lg"
      >
        <div className="p-6 space-y-6">
          <Input
            label="URL del Webhook"
            type="url"
            placeholder="https://tu-servidor.com/webhook"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          />

          <Input
            label="Secret (opcional)"
            type="text"
            placeholder="Clave secreta para firmar requests"
            value={formData.secret}
            onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Timeout (ms)"
              type="number"
              value={formData.timeout_ms}
              onChange={(e) => setFormData({ ...formData, timeout_ms: parseInt(e.target.value) })}
            />
            <Input
              label="Max Reintentos"
              type="number"
              value={formData.max_retries}
              onChange={(e) => setFormData({ ...formData, max_retries: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Eventos a escuchar
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              {WEBHOOK_EVENTS.map((event) => (
                <label
                  key={event.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${formData.events?.includes(event.id)
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={formData.events?.includes(event.id)}
                    onChange={() => toggleEvent(event.id)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {event.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {event.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateWebhook}
              isLoading={isActing}
              fullWidth
            >
              Crear Webhook
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
