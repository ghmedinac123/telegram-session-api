import { useState, useMemo } from 'react'
import { Users, User, Hash, Volume2, Archive, Pin, Search, X, MessageSquare } from 'lucide-react'
import { Chat, ChatType } from '@/api/chats.api'
import { Card } from '@/components/common'

interface ChatListProps {
  chats: Chat[]
  selectedChatId: number | null
  onSelectChat: (chatId: number) => void
  totalCount?: number
  hasMore?: boolean
}

export const ChatList = ({ chats, selectedChatId, onSelectChat, totalCount, hasMore }: ChatListProps) => {
  const [searchTerm, setSearchTerm] = useState('')

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
    // Check for zero date
    if (date.getFullYear() < 2000) return ''
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days === 1) return 'Ayer'
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  // Filter chats based on search term
  const filteredChats = useMemo(() => {
    if (!searchTerm) return chats
    const term = searchTerm.toLowerCase()
    return chats.filter((chat) => {
      const title = getChatTitle(chat).toLowerCase()
      const username = chat.username?.toLowerCase() || ''
      const lastMessage = chat.last_message?.toLowerCase() || ''
      return title.includes(term) || username.includes(term) || lastMessage.includes(term)
    })
  }, [chats, searchTerm])

  return (
    <div className="space-y-3">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Conversaciones
        </h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
          {totalCount || chats.length}
        </span>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-9 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Search results count */}
      {searchTerm && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filteredChats.length} resultado{filteredChats.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Chat list */}
      <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? `No se encontraron chats para "${searchTerm}"` : 'No hay chats'}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const ChatIcon = getChatIcon(chat.type)
            const isSelected = chat.id === selectedChatId

            return (
              <Card
                key={chat.id}
                hover
                className={`cursor-pointer transition-all duration-150 p-3 ${
                  isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 ring-1 ring-primary-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
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
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                            {getChatTitle(chat)}
                          </h3>
                          {chat.is_pinned && (
                            <Pin className="w-3 h-3 text-primary-600 dark:text-primary-400 shrink-0" />
                          )}
                        </div>
                        {chat.username && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                            @{chat.username}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {formatLastMessageTime(chat.last_message_at) && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {formatLastMessageTime(chat.last_message_at)}
                          </span>
                        )}
                        {chat.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-primary-600 text-white rounded-full min-w-[18px]">
                            {chat.unread_count > 99 ? '99+' : chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {chat.last_message && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                        {chat.last_message}
                      </p>
                    )}

                    {(chat.is_muted || chat.is_archived) && (
                      <div className="flex items-center gap-2 mt-1.5">
                        {chat.is_muted && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Volume2 className="w-3 h-3" />
                          </div>
                        )}
                        {chat.is_archived && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Archive className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Load more indicator */}
      {hasMore && !searchTerm && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 py-2">
          Hay mas chats disponibles
        </p>
      )}
    </div>
  )
}
