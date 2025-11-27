import { Smartphone, CheckCircle, Clock, XCircle, Trash2, Send, MessageCircle, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TelegramSession } from '@/types'
import { Card, Button } from '@/components/common'
import { useDeleteSession } from '@/hooks'

interface SessionCardProps {
  session: TelegramSession
}

export const SessionCard = ({ session }: SessionCardProps) => {
  const deleteSession = useDeleteSession()
  const navigate = useNavigate()

  const getStatusConfig = () => {
    if (session.is_active) {
      return {
        icon: CheckCircle,
        text: 'Activa',
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
      }
    }

    switch (session.auth_state) {
      case 'pending':
      case 'code_sent':
        return {
          icon: Clock,
          text: 'Pendiente',
          color: 'text-yellow-600 dark:text-yellow-400',
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        }
      case 'failed':
        return {
          icon: XCircle,
          text: 'Fallida',
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-100 dark:bg-red-900/30',
        }
      default:
        return {
          icon: Clock,
          text: session.auth_state,
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-100 dark:bg-gray-900/30',
        }
    }
  }

  const status = getStatusConfig()
  const StatusIcon = status.icon

  const handleDelete = async () => {
    if (confirm('¿Estás seguro de eliminar esta sesión?')) {
      await deleteSession.mutateAsync(session.id)
    }
  }

  return (
    <Card hover className="group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Smartphone className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {session.session_name}
              </h3>
              {session.phone_number && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {session.phone_number}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg}`}>
              <StatusIcon className={`w-4 h-4 ${status.color}`} />
              <span className={`font-medium ${status.color}`}>{status.text}</span>
            </div>

            {session.telegram_username && (
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">@{session.telegram_username}</span>
              </div>
            )}

            {session.telegram_user_id && (
              <div className="text-gray-500 dark:text-gray-500 text-xs">
                ID: {session.telegram_user_id}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <span>Creada: {new Date(session.created_at).toLocaleDateString('es-ES')}</span>
            <span>•</span>
            <span>Actualizada: {new Date(session.updated_at).toLocaleDateString('es-ES')}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.is_active && (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate(`/chats/${session.id}`)}
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chats
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate(`/contacts/${session.id}`)}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Contactos
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate(`/messages/${session.id}`)}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Mensajes
              </Button>
            </>
          )}
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteSession.isPending}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
