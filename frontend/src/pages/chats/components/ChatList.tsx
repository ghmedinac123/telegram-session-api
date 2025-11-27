import { Users, User, Hash, Volume2, Archive, Pin } from 'lucide-react'
import { Chat, ChatType } from '@/api/chats.api'
import { Card } from '@/components/common'

interface ChatListProps {
  chats: Chat[]
  selectedChatId: number | null
  onSelectChat: (chatId: number) => void
}

export const ChatList = ({ chats, selectedChatId, onSelectChat }: ChatListProps) => {
  const getChatIcon = (type: ChatType) => {
    switch (type) {
      case 'private':
        return User
      case 'group':
      case 'supergroup':
        return Users
      case 'channel':
        return Hash
      default:
        return User
    }
  }

  const getChatTitle = (chat: Chat) => {
    if (chat.title) return chat.title
    const firstName = chat.first_name || ''
    const lastName = chat.last_name || ''
    return `${firstName} ${lastName}`.trim() || 'Sin nombre'
  }

  const formatLastMessageTime = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'Ahora'
    if (hours < 24) return `${hours}h`
    if (days === 1) return 'Ayer'
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Conversaciones ({chats.length})
      </h2>
      <div className="space-y-1">
        {chats.map((chat) => {
          const ChatIcon = getChatIcon(chat.type)
          const isSelected = chat.id === selectedChatId

          return (
            <Card
              key={chat.id}
              hover
              className={`cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <ChatIcon
                    className={`w-5 h-5 ${
                      isSelected
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {getChatTitle(chat)}
                        </h3>
                        {chat.is_pinned && (
                          <Pin className="w-3 h-3 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                        )}
                      </div>
                      {chat.username && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">@{chat.username}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {chat.last_message_at && (
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatLastMessageTime(chat.last_message_at)}
                        </span>
                      )}
                      {chat.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-primary-600 text-white rounded-full min-w-[20px]">
                          {chat.unread_count > 99 ? '99+' : chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {chat.last_message && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                      {chat.last_message}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    {chat.is_muted && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Volume2 className="w-3 h-3" />
                        <span>Silenciado</span>
                      </div>
                    )}
                    {chat.is_archived && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Archive className="w-3 h-3" />
                        <span>Archivado</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
