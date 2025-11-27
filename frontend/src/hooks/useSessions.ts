import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsApi } from '@/api'
import type { CreateSessionRequest } from '@/types'

export const SESSIONS_QUERY_KEY = 'sessions'

export const useSessions = () => {
  return useQuery({
    queryKey: [SESSIONS_QUERY_KEY],
    queryFn: () => sessionsApi.list(),
  })
}

export const useSession = (sessionId: string) => {
  return useQuery({
    queryKey: [SESSIONS_QUERY_KEY, sessionId],
    queryFn: () => sessionsApi.get(sessionId),
    enabled: !!sessionId,
  })
}

export const useCreateSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSessionRequest) => sessionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
    },
  })
}

export const useVerifyCode = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, code }: { sessionId: string; code: string }) =>
      sessionsApi.verifyCode(sessionId, { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
    },
  })
}

export const useDeleteSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.delete(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] })
    },
  })
}
