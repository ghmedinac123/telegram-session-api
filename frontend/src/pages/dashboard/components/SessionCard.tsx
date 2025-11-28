import { Smartphone, CheckCircle, Clock, XCircle, Trash2, Send, MessageCircle, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TelegramSession } from '@/types'
import { Card, Button } from '@/components/common'
import { useDeleteSession } from '@/hooks'
import { useConfirm, useToast } from '@/contexts'

interface SessionCardProps {
  session: TelegramSession
}

export const SessionCard = ({ session }: SessionCardProps) => {
  const deleteSession = useDeleteSession()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirm()
  const toast = useToast()

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
    const confirmed = await confirmDelete(session.session_name)
    if (confirmed) {
      try {
        await deleteSession.mutateAsync(session.id)
        toast.success('Sesion eliminada', `La sesion "${session.session_name}" ha sido eliminada`)
      } catch {
        toast.error('Error interno', 'No se pudo eliminar la sesion')
      }
    }
  }

  return (
    <Card hover className="group">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Session Info */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex-shrink-0">
              <Smartphone className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {session.session_name}
              </h3>
              {session.phone_number && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                  {session.phone_number}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg}`}>
              <StatusIcon className={`w-4 h-4 ${status.color}`} />
              <span className={`font-medium ${status.color}`}>{status.text}</span>
            </div>

            {session.telegram_username && (
              <div className="text-gray-600 dark:text-gray-400 truncate">
                <span className="font-medium">@{session.telegram_username}</span>
              </div>
            )}

            {session.telegram_user_id && (
              <div className="text-gray-500 dark:text-gray-500 text-xs">
                ID: {session.telegram_user_id}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-500">
            <span>Creada: {new Date(session.created_at).toLocaleDateString('es-ES')}</span>
            <span className="hidden sm:inline">•</span>
            <span>Actualizada: {new Date(session.updated_at).toLocaleDateString('es-ES')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {session.is_active && (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate(`/chats/${session.id}`)}
                className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="sm:inline">Chats</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate(`/contacts/${session.id}`)}
                className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
              >
                <Users className="w-4 h-4" />
                <span className="sm:inline">Contactos</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate(`/messages/${session.id}`)}
                className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
              >
                <Send className="w-4 h-4" />
                <span className="sm:inline">Mensajes</span>
              </Button>
            </>
          )}
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteSession.isPending}
            className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
