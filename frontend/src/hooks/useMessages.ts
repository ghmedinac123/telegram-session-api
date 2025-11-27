import { useMutation, useQuery } from '@tanstack/react-query'
import { messagesApi } from '@/api'
import type {
  SendTextRequest,
  SendPhotoRequest,
  SendVideoRequest,
  SendAudioRequest,
  SendFileRequest,
  SendBulkRequest,
} from '@/api/messages.api'

export const MESSAGE_QUERY_KEY = 'messages'

export const useSendTextMessage = () => {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: SendTextRequest }) =>
      messagesApi.sendText(sessionId, data),
  })
}

export const useSendPhotoMessage = () => {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: SendPhotoRequest }) =>
      messagesApi.sendPhoto(sessionId, data),
  })
}

export const useSendVideoMessage = () => {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: SendVideoRequest }) =>
      messagesApi.sendVideo(sessionId, data),
  })
}

export const useSendAudioMessage = () => {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: SendAudioRequest }) =>
      messagesApi.sendAudio(sessionId, data),
  })
}

export const useSendFileMessage = () => {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: SendFileRequest }) =>
      messagesApi.sendFile(sessionId, data),
  })
}

export const useSendBulkMessage = () => {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: SendBulkRequest }) =>
      messagesApi.sendBulk(sessionId, data),
  })
}

export const useMessageStatus = (jobId: string) => {
  return useQuery({
    queryKey: [MESSAGE_QUERY_KEY, jobId],
    queryFn: () => messagesApi.getStatus(jobId),
    enabled: !!jobId,
    refetchInterval: 3000, // Polling cada 3 segundos
  })
}
