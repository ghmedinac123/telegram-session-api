import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWebhookConfig,
  createWebhook,
  deleteWebhook,
  startWebhook,
  stopWebhook,
  getPoolStatus,
  WebhookCreateRequest,
} from '@/api/webhooks.api'

// Query keys
const webhookKeys = {
  all: ['webhooks'] as const,
  config: (sessionId: string) => [...webhookKeys.all, 'config', sessionId] as const,
  pool: () => [...webhookKeys.all, 'pool'] as const,
}

/**
 * Hook para obtener la configuracion del webhook de una sesion
 */
export const useWebhookConfig = (sessionId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: webhookKeys.config(sessionId),
    queryFn: () => getWebhookConfig(sessionId),
    enabled: options?.enabled !== false && !!sessionId,
    retry: false,
    staleTime: 10000, // 10 segundos
  })
}

/**
 * Hook para obtener el estado del pool de sesiones activas
 */
export const usePoolStatus = (options?: { enabled?: boolean; refetchInterval?: number }) => {
  return useQuery({
    queryKey: webhookKeys.pool(),
    queryFn: getPoolStatus,
    enabled: options?.enabled !== false,
    refetchInterval: options?.refetchInterval ?? 5000, // Refrescar cada 5s por defecto
    staleTime: 3000,
  })
}

/**
 * Hook para crear un webhook
 */
export const useCreateWebhook = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: WebhookCreateRequest }) =>
      createWebhook(sessionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.config(variables.sessionId) })
    },
  })
}

/**
 * Hook para eliminar un webhook
 */
export const useDeleteWebhook = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => deleteWebhook(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.config(sessionId) })
      queryClient.invalidateQueries({ queryKey: webhookKeys.pool() })
    },
  })
}

/**
 * Hook para iniciar la escucha del webhook
 */
export const useStartWebhook = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => startWebhook(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.config(sessionId) })
      queryClient.invalidateQueries({ queryKey: webhookKeys.pool() })
    },
  })
}

/**
 * Hook para detener la escucha del webhook
 */
export const useStopWebhook = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => stopWebhook(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.config(sessionId) })
      queryClient.invalidateQueries({ queryKey: webhookKeys.pool() })
    },
  })
}

/**
 * Hook combinado para gestionar webhooks con todas las operaciones
 */
export const useWebhook = (sessionId: string) => {
  const config = useWebhookConfig(sessionId)
  const pool = usePoolStatus({ enabled: !!config.data })
  const createMutation = useCreateWebhook()
  const deleteMutation = useDeleteWebhook()
  const startMutation = useStartWebhook()
  const stopMutation = useStopWebhook()

  // Verificar si esta sesion esta activamente escuchando en el pool
  const isListening = pool.data?.sessions?.some(
    (s) => s.session_id === sessionId && s.is_connected
  ) ?? false

  const poolSession = pool.data?.sessions?.find((s) => s.session_id === sessionId)

  return {
    // Estado
    config: config.data,
    isLoading: config.isLoading,
    isError: config.isError,
    error: config.error,
    isListening,
    poolSession,
    poolStatus: pool.data,

    // Acciones
    create: async (data: WebhookCreateRequest, autoStart = false) => {
      const result = await createMutation.mutateAsync({ sessionId, data })
      if (autoStart) {
        await startMutation.mutateAsync(sessionId)
      }
      return result
    },
    delete: () => deleteMutation.mutateAsync(sessionId),
    start: () => startMutation.mutateAsync(sessionId),
    stop: () => stopMutation.mutateAsync(sessionId),
    refetch: () => {
      config.refetch()
      pool.refetch()
    },

    // Estados de mutaciones
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isActing: createMutation.isPending || deleteMutation.isPending ||
              startMutation.isPending || stopMutation.isPending,
  }
}
