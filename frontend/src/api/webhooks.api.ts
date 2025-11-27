import { apiClient } from './client'

// =============== TYPES ===============

export interface WebhookConfig {
  id: string
  session_id: string
  url: string
  events: string[]
  secret?: string
  timeout_ms: number
  max_retries: number
  is_active: boolean
  last_error?: string
  last_error_at?: string
  created_at: string
  updated_at: string
}

export interface WebhookCreateRequest {
  url: string
  events?: string[]
  secret?: string
  timeout_ms?: number
  max_retries?: number
}

export interface WebhookResponse {
  id: string
  session_id: string
  url: string
  events: string[]
  is_active: boolean
}

// =============== API FUNCTIONS ===============

/**
 * Obtiene la configuración actual del webhook
 */
export const getWebhookConfig = async (sessionId: string): Promise<WebhookConfig> => {
  return apiClient.get<WebhookConfig>(`/sessions/${sessionId}/webhook`)
}

/**
 * Configura un webhook para la sesión
 */
export const createWebhook = async (
  sessionId: string,
  data: WebhookCreateRequest
): Promise<WebhookResponse> => {
  return apiClient.post<WebhookResponse>(`/sessions/${sessionId}/webhook`, data)
}

/**
 * Elimina la configuración del webhook
 */
export const deleteWebhook = async (sessionId: string): Promise<void> => {
  return apiClient.delete(`/sessions/${sessionId}/webhook`)
}

/**
 * Inicia la escucha de eventos del webhook
 */
export const startWebhook = async (sessionId: string): Promise<void> => {
  return apiClient.post(`/sessions/${sessionId}/webhook/start`)
}

/**
 * Detiene la escucha de eventos del webhook
 */
export const stopWebhook = async (sessionId: string): Promise<void> => {
  return apiClient.post(`/sessions/${sessionId}/webhook/stop`)
}
