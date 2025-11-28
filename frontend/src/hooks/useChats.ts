import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import {
  getChats,
  getChatInfo,
  getChatHistory,
  getContacts,
  GetChatsParams,
  GetHistoryParams,
  GetContactsParams,
  ChatsResponse,
  Chat,
  HistoryResponse,
  ContactsResponse,
} from '@/api/chats.api'

// =============== QUERY KEYS ===============

export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  list: (sessionId: string, params?: GetChatsParams) =>
    [...chatKeys.lists(), sessionId, params] as const,
  details: () => [...chatKeys.all, 'detail'] as const,
  detail: (sessionId: string, chatId: number) =>
    [...chatKeys.details(), sessionId, chatId] as const,
  history: (sessionId: string, chatId: number, params?: GetHistoryParams) =>
    [...chatKeys.all, 'history', sessionId, chatId, params] as const,
}

export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (sessionId: string, params?: GetContactsParams) =>
    [...contactKeys.lists(), sessionId, params] as const,
  infinite: (sessionId: string, search?: string) =>
    [...contactKeys.all, 'infinite', sessionId, search] as const,
}

// =============== HOOKS ===============

/**
 * Hook para obtener la lista de chats de una sesión
 */
export const useChats = (sessionId: string, params?: GetChatsParams) => {
  return useQuery<ChatsResponse>({
    queryKey: chatKeys.list(sessionId, params),
    queryFn: () => getChats(sessionId, params),
    enabled: !!sessionId,
    staleTime: 1000 * 30, // 30 segundos
  })
}

/**
 * Hook para obtener información de un chat específico
 */
export const useChatInfo = (sessionId: string, chatId: number) => {
  return useQuery<Chat>({
    queryKey: chatKeys.detail(sessionId, chatId),
    queryFn: () => getChatInfo(sessionId, chatId),
    enabled: !!sessionId && !!chatId,
    staleTime: 1000 * 60, // 1 minuto
  })
}

/**
 * Hook para obtener el historial de mensajes de un chat
 */
export const useChatHistory = (
  sessionId: string,
  chatId: number,
  params?: GetHistoryParams
) => {
  return useQuery<HistoryResponse>({
    queryKey: chatKeys.history(sessionId, chatId, params),
    queryFn: () => getChatHistory(sessionId, chatId, params),
    enabled: !!sessionId && !!chatId,
    staleTime: 1000 * 10, // 10 segundos
  })
}

/**
 * Hook para obtener la lista de contactos con paginación
 */
export const useContacts = (sessionId: string, params?: GetContactsParams) => {
  return useQuery<ContactsResponse>({
    queryKey: contactKeys.list(sessionId, params),
    queryFn: () => getContacts(sessionId, params),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para obtener contactos con infinite scroll
 */
export const useInfiniteContacts = (sessionId: string, search?: string, limit: number = 50) => {
  return useInfiniteQuery({
    queryKey: contactKeys.infinite(sessionId, search),
    queryFn: ({ pageParam = 0 }) =>
      getContacts(sessionId, { limit, offset: pageParam, search }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.has_more) return undefined
      return allPages.length * limit
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}
