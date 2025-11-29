import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, Image as ImageIcon, Video, Music, FileText, CheckCheck, Check, RefreshCw } from 'lucide-react'
import { useChatHistory, useChatInfo } from '@/hooks'
import { Alert, Card, Button } from '@/components/common'
import { ChatMessage } from '@/api/chats.api'
import { MessageInput } from './MessageInput'

interface ChatViewProps {
  sessionId: string
  chatId: number
}

export const ChatView = ({ sessionId, chatId }: ChatViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [lastMessageCount, setLastMessageCount] = useState(0)
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const { data: chatInfo } = useChatInfo(sessionId, chatId)
  const { data: historyData, isLoading, error, refetch, isFetching } = useChatHistory(sessionId, chatId, {
    limit: 50,
    enablePolling: true,
    pollingInterval: 4000, // Polling cada 4 segundos
  })

  const getMediaIcon = (mediaType?: string) => {
    if (!mediaType) return null

    const iconClass = 'w-4 h-4'
    switch (mediaType.toLowerCase()) {
      case 'photo':
        return <ImageIcon className={iconClass} />
      case 'video':
        return <Video className={iconClass} />
      case 'audio':
        return <Music className={iconClass} />
      case 'document':
      case 'file':
        return <FileText className={iconClass} />
      default:
        return null
    }
  }

  const getMediaLabel = (mediaType?: string) => {
    if (!mediaType) return ''
    switch (mediaType.toLowerCase()) {
      case 'photo':
        return 'Foto'
      case 'video':
        return 'Video'
      case 'audio':
        return 'Audio'
      case 'document':
      case 'file':
        return 'Documento'
      default:
        return mediaType
    }
  }

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer'
    }
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    // Invertir para que los más antiguos estén primero (como WhatsApp)
    const sortedMessages = [...messages].reverse()

    const groups: { [key: string]: ChatMessage[] } = {}
    const dateOrder: string[] = []

    sortedMessages.forEach((msg) => {
      const dateKey = new Date(msg.date).toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
        dateOrder.push(dateKey)
      }
      groups[dateKey].push(msg)
    })

    return dateOrder.map((dateKey) => ({
      date: groups[dateKey][0].date,
      messages: groups[dateKey],
    }))
  }

  // Scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Detectar si el usuario hizo scroll hacia arriba
  const handleScroll = () => {
    if (!messagesContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    // Si está a menos de 100px del fondo, consideramos que está abajo
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsUserScrolledUp(!isAtBottom)
  }

  // Obtener mensajes (siempre, para que el useEffect funcione)
  const messages = historyData?.messages ?? []
  const messageGroups = messages.length > 0 ? groupMessagesByDate(messages) : []

  // Solo hacer scroll automático cuando llegan mensajes nuevos y el usuario no está scrolleado arriba
  useEffect(() => {
    const currentCount = messages.length
    if (currentCount > lastMessageCount) {
      // Hay mensajes nuevos
      if (!isUserScrolledUp || lastMessageCount === 0) {
        // Solo scroll si el usuario está abajo o es la primera carga
        scrollToBottom(lastMessageCount === 0 ? 'instant' : 'smooth')
      }
      setLastMessageCount(currentCount)
    } else if (currentCount !== lastMessageCount) {
      setLastMessageCount(currentCount)
    }
  }, [messages.length, lastMessageCount, isUserScrolledUp])

  // Handle message sent - refetch immediately and scroll
  const handleMessageSent = () => {
    // Forzar que no esté scrolleado para que el auto-scroll funcione
    setIsUserScrolledUp(false)
    // Refetch inmediato y después de un segundo (el polling se encarga del resto)
    refetch()
    setTimeout(() => {
      refetch()
      scrollToBottom()
    }, 1000)
  }

  if (isLoading) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando mensajes...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Error al cargar el historial del chat</span>
        </div>
      </Alert>
    )
  }
  const chatTitle = chatInfo?.title ||
    `${chatInfo?.first_name || ''} ${chatInfo?.last_name || ''}`.trim() ||
    'Chat'

  return (
    <Card className="flex flex-col h-[calc(100vh-200px)] sm:h-[650px] overflow-hidden p-0">
      {/* Chat Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 shrink-0 flex items-center justify-between">
        <div className="min-w-0 flex items-center gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {chatTitle}
            </h3>
            {chatInfo?.username && (
              <p className="text-sm text-gray-500 dark:text-gray-500">@{chatInfo.username}</p>
            )}
          </div>
          {/* Indicador de sincronización en tiempo real */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-green-700 dark:text-green-400 font-medium">Sync</span>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay mensajes en este chat</p>
              <p className="text-sm mt-1">Envia el primer mensaje</p>
            </div>
          </div>
        ) : (
          <>
            {messageGroups.map((group, groupIdx) => (
              <div key={groupIdx}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-3 sm:my-4">
                  <div className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                    {formatMessageDate(group.date)}
                  </div>
                </div>

                {/* Messages */}
                {group.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex mb-2 sm:mb-3 ${message.is_outgoing ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2 shadow-sm ${
                        message.is_outgoing
                          ? 'bg-primary-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
                      }`}
                    >
                      {/* Sender Name (for incoming messages) */}
                      {!message.is_outgoing && message.from_name && (
                        <div className="text-xs font-semibold mb-1 text-primary-600 dark:text-primary-400">
                          {message.from_name}
                        </div>
                      )}

                      {/* Forward Info */}
                      {message.forward_from && (
                        <div className="text-xs mb-1 opacity-75 italic">
                          Reenviado de: {message.forward_from}
                        </div>
                      )}

                      {/* Media Type */}
                      {message.media_type && (
                        <div className={`flex items-center gap-2 mb-2 text-sm ${
                          message.is_outgoing ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {getMediaIcon(message.media_type)}
                          <span>{getMediaLabel(message.media_type)}</span>
                        </div>
                      )}

                      {/* Message Text */}
                      {message.text && (
                        <div className="whitespace-pre-wrap break-words text-sm sm:text-base">
                          {message.text}
                        </div>
                      )}

                      {/* Time and Read Status */}
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] sm:text-xs ${
                          message.is_outgoing ? 'text-white/70' : 'text-gray-500 dark:text-gray-500'
                        }`}
                      >
                        <span>{formatMessageTime(message.date)}</span>
                        {message.is_outgoing && (
                          <>
                            {message.is_read ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Footer Info */}
      {messages.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-500 text-center bg-gray-50 dark:bg-gray-900/50">
          {messages.length} mensaje{messages.length !== 1 ? 's' : ''}
          {historyData?.has_more && ' • Hay mas mensajes anteriores'}
        </div>
      )}

      {/* Message Input */}
      <MessageInput
        sessionId={sessionId}
        chatId={chatId}
        onMessageSent={handleMessageSent}
      />
    </Card>
  )
}
