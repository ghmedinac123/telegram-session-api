import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle, MessageCircle } from 'lucide-react'
import { Layout } from '@/components/layout'
import { Button, Alert } from '@/components/common'
import { useChats, useSession } from '@/hooks'
import { ChatList } from './components/ChatList'
import { ChatView } from './components/ChatView'

export const ChatsPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)

  const { data: session, isLoading: sessionLoading } = useSession(sessionId!)
  const { data: chatsData, isLoading: chatsLoading, error } = useChats(sessionId!, { limit: 50 })

  const isLoading = sessionLoading || chatsLoading

  if (!sessionId) {
    return (
      <Layout>
        <Alert variant="error">ID de sesión no válido</Alert>
      </Layout>
    )
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!session) {
    return (
      <Layout>
        <Alert variant="error">Sesión no encontrada</Alert>
      </Layout>
    )
  }

  if (!session.is_active) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sesión no activa
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Esta sesión no está activa. Por favor, verifica la sesión primero.
          </p>
          <Button variant="primary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chats</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {session.phone_number || session.session_name}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Error al cargar los chats. Intenta nuevamente.</span>
            </div>
          </Alert>
        )}

        {chatsData && chatsData.chats.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay chats
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No se encontraron conversaciones en esta sesión
            </p>
          </div>
        )}

        {chatsData && chatsData.chats.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ChatList
                chats={chatsData.chats}
                selectedChatId={selectedChatId}
                onSelectChat={setSelectedChatId}
              />
            </div>

            <div className="lg:col-span-2">
              {selectedChatId ? (
                <ChatView sessionId={sessionId} chatId={selectedChatId} />
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Selecciona un chat para ver la conversación
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
