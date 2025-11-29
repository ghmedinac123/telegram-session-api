import { useState } from 'react'
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
  Clock,
  Link as LinkIcon,
  Shield,
  RefreshCw,
  Zap,
  Radio,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Layout } from '@/components/layout'
import { Button, Alert, Card, Input, Modal } from '@/components/common'
import { useSession, useWebhook } from '@/hooks'
import { useToast } from '@/contexts'
import { WEBHOOK_EVENTS } from '@/config/constants'
import { WebhookCreateRequest } from '@/api/webhooks.api'

export const WebhooksPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: session, isLoading: sessionLoading } = useSession(sessionId!)
  const webhook = useWebhook(sessionId!)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [autoStart, setAutoStart] = useState(true)

  // Form state
  const [formData, setFormData] = useState<WebhookCreateRequest>({
    url: '',
    events: ['message.new'],
    secret: '',
    timeout_ms: 5000,
    max_retries: 3,
  })

  const handleCreateWebhook = async () => {
    if (!formData.url) {
      toast.error('Error', 'La URL es requerida')
      return
    }

    try {
      await webhook.create(formData, autoStart)
      toast.success(
        'Webhook creado',
        autoStart
          ? 'El webhook ha sido creado y esta escuchando eventos'
          : 'El webhook ha sido configurado correctamente'
      )
      setShowCreateModal(false)
      resetForm()
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo crear el webhook')
    }
  }

  const handleDeleteWebhook = async () => {
    try {
      await webhook.delete()
      toast.success('Webhook eliminado', 'El webhook ha sido eliminado')
      setShowDeleteConfirm(false)
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo eliminar el webhook')
    }
  }

  const handleStartWebhook = async () => {
    try {
      await webhook.start()
      toast.success('Webhook iniciado', 'El webhook esta escuchando eventos')
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo iniciar el webhook')
    }
  }

  const handleStopWebhook = async () => {
    try {
      await webhook.stop()
      toast.success('Webhook detenido', 'El webhook ha dejado de escuchar')
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo detener el webhook')
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

  const resetForm = () => {
    setFormData({
      url: '',
      events: ['message.new'],
      secret: '',
      timeout_ms: 5000,
      max_retries: 3,
    })
    setAutoStart(true)
  }

  const selectAllEvents = () => {
    setFormData((prev) => ({
      ...prev,
      events: WEBHOOK_EVENTS.map((e) => e.id),
    }))
  }

  const clearAllEvents = () => {
    setFormData((prev) => ({
      ...prev,
      events: [],
    }))
  }

  if (!sessionId) {
    return (
      <Layout>
        <Alert variant="error">ID de sesion no valido</Alert>
      </Layout>
    )
  }

  if (sessionLoading || webhook.isLoading) {
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

  const config = webhook.config

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

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => webhook.refetch()} disabled={webhook.isActing}>
              <RefreshCw className={`w-4 h-4 ${webhook.isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {!config && (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Configurar Webhook
              </Button>
            )}
          </div>
        </div>

        {/* Connection Status Banner */}
        {config && (
          <div
            className={`p-4 rounded-xl border-2 transition-all ${
              webhook.isListening
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full ${
                    webhook.isListening
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Radio
                    className={`w-5 h-5 ${
                      webhook.isListening
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400'
                    }`}
                  />
                  {webhook.isListening && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {webhook.isListening ? 'Escuchando eventos' : 'Webhook detenido'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {webhook.isListening
                      ? `Conectado desde ${webhook.poolSession?.started_at ? new Date(webhook.poolSession.started_at).toLocaleTimeString('es-ES') : 'ahora'}`
                      : 'Inicia el webhook para recibir eventos'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {webhook.isListening ? (
                  <Button
                    variant="secondary"
                    onClick={handleStopWebhook}
                    isLoading={webhook.isStopping}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Detener
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleStartWebhook}
                    isLoading={webhook.isStarting}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Webhook Config Card */}
        {config ? (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-xl ${
                    webhook.isListening
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Webhook
                    className={`w-6 h-6 ${
                      webhook.isListening
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500'
                    }`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Configuracion del Webhook
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Creado el {new Date(config.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>

              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                isLoading={webhook.isDeleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Config details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <LinkIcon className="w-4 h-4" />
                  URL de destino
                </div>
                <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                  {config.url}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Shield className="w-4 h-4" />
                    Secret
                  </div>
                  {config.secret && (
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <p className="font-mono text-sm text-gray-900 dark:text-white">
                  {config.secret
                    ? showSecret
                      ? config.secret
                      : '••••••••••••••••'
                    : 'No configurado'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Clock className="w-4 h-4" />
                  Timeout
                </div>
                <p className="text-sm text-gray-900 dark:text-white">
                  {config.timeout_ms}ms ({(config.timeout_ms / 1000).toFixed(1)}s)
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <RefreshCw className="w-4 h-4" />
                  Reintentos
                </div>
                <p className="text-sm text-gray-900 dark:text-white">
                  {config.max_retries} intentos
                </p>
              </div>
            </div>

            {/* Events */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Eventos suscritos ({config.events?.length || 0})
              </h4>
              {config.events && config.events.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {config.events.map((eventId) => {
                    const event = WEBHOOK_EVENTS.find((e) => e.id === eventId)
                    return (
                      <span
                        key={eventId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-sm font-medium"
                      >
                        <Zap className="w-3 h-3" />
                        {event?.label || eventId}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay eventos configurados - se recibiran todos los eventos
                </p>
              )}
            </div>

            {/* Last error */}
            {config.last_error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Ultimo error
                </div>
                <p className="text-sm text-red-600 dark:text-red-300">{config.last_error}</p>
                {config.last_error_at && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                    {new Date(config.last_error_at).toLocaleString('es-ES')}
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

        {/* Pool Status */}
        {webhook.poolStatus && webhook.poolStatus.active_count > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Pool de sesiones activas ({webhook.poolStatus.active_count})
              </h3>
            </div>
            <div className="space-y-2">
              {webhook.poolStatus.sessions.map((poolSession) => (
                <div
                  key={poolSession.session_id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    poolSession.session_id === sessionId
                      ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        poolSession.is_connected ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {poolSession.session_name}
                        {poolSession.session_id === sessionId && (
                          <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">
                            (Esta sesion)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {poolSession.telegram_id}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      poolSession.is_connected
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {poolSession.is_connected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Events info */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Eventos disponibles</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {WEBHOOK_EVENTS.map((event) => (
              <div key={event.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-primary-500" />
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{event.label}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
                <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">
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
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Configurar Webhook"
        size="lg"
      >
        <div className="p-6 space-y-6">
          <Input
            label="URL del Webhook *"
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
            helperText="Se usara para firmar los requests con HMAC-SHA256"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Timeout (ms)"
              type="number"
              value={formData.timeout_ms}
              onChange={(e) =>
                setFormData({ ...formData, timeout_ms: parseInt(e.target.value) || 5000 })
              }
              min={1000}
              max={30000}
            />
            <Input
              label="Max Reintentos"
              type="number"
              value={formData.max_retries}
              onChange={(e) =>
                setFormData({ ...formData, max_retries: parseInt(e.target.value) || 3 })
              }
              min={0}
              max={10}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Eventos a escuchar ({formData.events?.length || 0} seleccionados)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllEvents}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Seleccionar todos
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  onClick={clearAllEvents}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  Limpiar
                </button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 max-h-64 overflow-y-auto">
              {WEBHOOK_EVENTS.map((event) => (
                <label
                  key={event.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                    ${
                      formData.events?.includes(event.id)
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
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {event.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {event.id}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {(!formData.events || formData.events.length === 0) && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Si no seleccionas eventos, se recibiran todos los tipos de eventos
              </p>
            )}
          </div>

          {/* Auto-start option */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Iniciar automaticamente
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  El webhook comenzara a escuchar eventos inmediatamente despues de crearse
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateWebhook}
              isLoading={webhook.isCreating || webhook.isStarting}
              fullWidth
            >
              <Webhook className="w-4 h-4 mr-2" />
              {autoStart ? 'Crear e Iniciar' : 'Crear Webhook'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Eliminar Webhook"
        size="sm"
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Estas seguro de eliminar el webhook?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Se dejara de escuchar eventos y se eliminara la configuracion
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} fullWidth>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteWebhook}
              isLoading={webhook.isDeleting}
              fullWidth
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
