import { Loader2, AlertCircle, Image as ImageIcon, Video, Music, FileText, CheckCheck, Check } from 'lucide-react'
import { useChatHistory, useChatInfo } from '@/hooks'
import { Alert, Card } from '@/components/common'
import { ChatMessage } from '@/api/chats.api'

interface ChatViewProps {
  sessionId: string
  chatId: number
}

export const ChatView = ({ sessionId, chatId }: ChatViewProps) => {
  const { data: chatInfo } = useChatInfo(sessionId, chatId)
  const { data: historyData, isLoading, error } = useChatHistory(sessionId, chatId, { limit: 50 })

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
    const groups: { [key: string]: ChatMessage[] } = {}

    messages.forEach((msg) => {
      const dateKey = new Date(msg.date).toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(msg)
    })

    return Object.entries(groups).map(([, msgs]) => ({
      date: msgs[0].date,
      messages: msgs,
    }))
  }

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
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

  if (!historyData || historyData.messages.length === 0) {
    return (
      <Card className="flex items-center justify-center py-12">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" />
          <p>No hay mensajes en este chat</p>
        </div>
      </Card>
    )
  }

  const messageGroups = groupMessagesByDate(historyData.messages)

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Chat Header */}
      {chatInfo && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {chatInfo.title ||
              `${chatInfo.first_name || ''} ${chatInfo.last_name || ''}`.trim() ||
              'Chat'}
          </h3>
          {chatInfo.username && (
            <p className="text-sm text-gray-500 dark:text-gray-500">@{chatInfo.username}</p>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messageGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {/* Date Separator */}
            <div className="flex items-center justify-center my-4">
              <div className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                {formatMessageDate(group.date)}
              </div>
            </div>

            {/* Messages */}
            {group.messages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-3 ${message.is_outgoing ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.is_outgoing
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
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
                    <div className="text-xs mb-1 opacity-75">
                      Reenviado de: {message.forward_from}
                    </div>
                  )}

                  {/* Media Type */}
                  {message.media_type && (
                    <div className="flex items-center gap-2 mb-2 text-sm opacity-90">
                      {getMediaIcon(message.media_type)}
                      <span className="capitalize">{message.media_type}</span>
                    </div>
                  )}

                  {/* Message Text */}
                  {message.text && <div className="whitespace-pre-wrap break-words">{message.text}</div>}

                  {/* Time and Read Status */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                      message.is_outgoing ? 'text-white/80' : 'text-gray-500 dark:text-gray-500'
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
      </div>

      {/* Footer Info */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-500 dark:text-gray-500 text-center">
        Mostrando {historyData.messages.length} mensajes
        {historyData.has_more && ' • Hay más mensajes disponibles'}
      </div>
    </Card>
  )
}
