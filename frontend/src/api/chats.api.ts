import { apiClient } from './client'

// =============== TYPES ===============

export type ChatType = 'private' | 'group' | 'supergroup' | 'channel'

export interface Chat {
  id: number
  type: ChatType
  title?: string
  first_name?: string
  last_name?: string
  username?: string
  photo?: string
  is_pinned: boolean
  is_muted: boolean
  is_archived: boolean
  unread_count: number
  last_message?: string
  last_message_id?: number
  last_message_at?: string
}

export interface ChatsResponse {
  chats: Chat[]
  total_count: number
  has_more: boolean
}

export interface GetChatsParams {
  limit?: number
  offset?: number
  archived?: boolean
}

export interface ChatMessage {
  id: number
  chat_id: number
  from_id: number
  from_name: string
  text: string
  date: string
  is_outgoing: boolean
  is_read: boolean
  media_type?: string
  forward_from?: string
}

export interface HistoryResponse {
  messages: ChatMessage[]
  total_count: number
  has_more: boolean
}

export interface GetHistoryParams {
  limit?: number
  offset_id?: number
  offset_date?: number
}

export interface Contact {
  id: number
  first_name: string
  last_name?: string
  username?: string
  phone?: string
  photo?: string
  status?: string
  last_seen_at?: string
  is_mutual: boolean
  is_blocked: boolean
}

export interface ContactsResponse {
  contacts: Contact[]
  total_count: number
  has_more: boolean
  from_cache?: boolean
}

export interface GetContactsParams {
  limit?: number
  offset?: number
  search?: string
}

// =============== API FUNCTIONS ===============

/**
 * Obtiene la lista de chats/diálogos de una sesión
 */
export const getChats = async (
  sessionId: string,
  params?: GetChatsParams
): Promise<ChatsResponse> => {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  if (params?.archived !== undefined)
    queryParams.append('archived', params.archived.toString())

  const query = queryParams.toString()
  const url = `/sessions/${sessionId}/chats${query ? `?${query}` : ''}`

  return apiClient.get<ChatsResponse>(url)
}

/**
 * Obtiene información detallada de un chat específico
 */
export const getChatInfo = async (sessionId: string, chatId: number): Promise<Chat> => {
  return apiClient.get<Chat>(`/sessions/${sessionId}/chats/${chatId}`)
}

/**
 * Obtiene el historial de mensajes de un chat
 */
export const getChatHistory = async (
  sessionId: string,
  chatId: number,
  params?: GetHistoryParams
): Promise<HistoryResponse> => {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset_id) queryParams.append('offset_id', params.offset_id.toString())
  if (params?.offset_date) queryParams.append('offset_date', params.offset_date.toString())

  const query = queryParams.toString()
  const url = `/sessions/${sessionId}/chats/${chatId}/history${query ? `?${query}` : ''}`

  return apiClient.get<HistoryResponse>(url)
}

/**
 * Obtiene la lista de contactos de Telegram
 */
export const getContacts = async (
  sessionId: string,
  params?: GetContactsParams
): Promise<ContactsResponse> => {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  if (params?.search) queryParams.append('search', params.search)

  const query = queryParams.toString()
  const url = `/sessions/${sessionId}/contacts${query ? `?${query}` : ''}`

  return apiClient.get<ContactsResponse>(url)
}
