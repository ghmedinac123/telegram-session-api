import { apiClient } from './client'

export interface SendTextRequest {
  to: string
  text: string
}

export interface SendPhotoRequest {
  to: string
  photo_url: string
  caption?: string
}

export interface SendVideoRequest {
  to: string
  video_url: string
  caption?: string
}

export interface SendAudioRequest {
  to: string
  audio_url: string
  caption?: string
}

export interface SendFileRequest {
  to: string
  file_url: string
  caption?: string
}

export interface SendBulkRequest {
  recipients: string[]
  text: string
  delay_ms?: number
}

export interface MessageResponse {
  job_id: string
  message: string
  status: string
  send_at?: string
}

export interface MessageJob {
  id: string
  session_id: string
  to: string
  type: string
  text?: string
  media_url?: string
  caption?: string
  status: string
  error?: string
  created_at: string
  sent_at?: string
}

export const messagesApi = {
  sendText: async (sessionId: string, data: SendTextRequest): Promise<MessageResponse> => {
    return apiClient.post<MessageResponse>(`/sessions/${sessionId}/messages/text`, data)
  },

  sendPhoto: async (sessionId: string, data: SendPhotoRequest): Promise<MessageResponse> => {
    return apiClient.post<MessageResponse>(`/sessions/${sessionId}/messages/photo`, data)
  },

  sendVideo: async (sessionId: string, data: SendVideoRequest): Promise<MessageResponse> => {
    return apiClient.post<MessageResponse>(`/sessions/${sessionId}/messages/video`, data)
  },

  sendAudio: async (sessionId: string, data: SendAudioRequest): Promise<MessageResponse> => {
    return apiClient.post<MessageResponse>(`/sessions/${sessionId}/messages/audio`, data)
  },

  sendFile: async (sessionId: string, data: SendFileRequest): Promise<MessageResponse> => {
    return apiClient.post<MessageResponse>(`/sessions/${sessionId}/messages/file`, data)
  },

  sendBulk: async (sessionId: string, data: SendBulkRequest): Promise<MessageResponse[]> => {
    return apiClient.post<MessageResponse[]>(`/sessions/${sessionId}/messages/bulk`, data)
  },

  getStatus: async (jobId: string): Promise<MessageJob> => {
    return apiClient.get<MessageJob>(`/messages/${jobId}/status`)
  },
}
