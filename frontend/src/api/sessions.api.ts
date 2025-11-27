import { apiClient } from './client'
import {
  TelegramSession,
  CreateSessionRequest,
  CreateSessionResponse,
  VerifyCodeRequest,
  SessionStatus,
} from '@/types'

export const sessionsApi = {
  create: async (data: CreateSessionRequest): Promise<CreateSessionResponse> => {
    return apiClient.post<CreateSessionResponse>('/sessions', data)
  },

  verifyCode: async (sessionId: string, data: VerifyCodeRequest): Promise<TelegramSession> => {
    return apiClient.post<TelegramSession>(`/sessions/${sessionId}/verify`, data)
  },

  list: async (): Promise<TelegramSession[]> => {
    return apiClient.get<TelegramSession[]>('/sessions')
  },

  get: async (sessionId: string): Promise<SessionStatus> => {
    return apiClient.get<SessionStatus>(`/sessions/${sessionId}`)
  },

  delete: async (sessionId: string): Promise<{ deleted: boolean }> => {
    return apiClient.delete<{ deleted: boolean }>(`/sessions/${sessionId}`)
  },
}
