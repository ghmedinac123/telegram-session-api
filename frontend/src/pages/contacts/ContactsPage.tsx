import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  User,
  Phone,
  Clock,
  UserCheck,
  UserX,
} from 'lucide-react'
import { Layout } from '@/components/layout'
import { Button, Alert, Card } from '@/components/common'
import { useContacts, useSession } from '@/hooks'
import { Contact } from '@/api/chats.api'

export const ContactsPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const { data: sessionData, isLoading: sessionLoading } = useSession(sessionId!)
  const { data: contactsData, isLoading: contactsLoading, error } = useContacts(sessionId!)

  const isLoading = sessionLoading || contactsLoading

  if (!sessionId) {
    return (
      <Layout>
        <Alert variant="error">ID de sesion no valido</Alert>
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

  if (!sessionData) {
    return (
      <Layout>
        <Alert variant="error">Sesion no encontrada</Alert>
      </Layout>
    )
  }

  const session = sessionData.session

  if (!session.is_active) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sesion no activa
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Esta sesion no esta activa. Por favor, verifica la sesion primero.
          </p>
          <Button variant="primary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </Layout>
    )
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-500'
    switch (status.toLowerCase()) {
      case 'online':
        return 'text-green-600 dark:text-green-400'
      case 'recently':
        return 'text-blue-600 dark:text-blue-400'
      case 'offline':
        return 'text-gray-500 dark:text-gray-500'
      default:
        return 'text-gray-500 dark:text-gray-500'
    }
  }

  const formatLastSeen = (lastSeenAt?: string) => {
    if (!lastSeenAt) return null
    const date = new Date(lastSeenAt)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'Hace menos de 1 hora'
    if (hours < 24) return `Hace ${hours}h`
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} días`
    return date.toLocaleDateString('es-ES')
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contactos</h1>
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
              <span>Error al cargar los contactos. Intenta nuevamente.</span>
            </div>
          </Alert>
        )}

        {contactsData && contactsData.contacts.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay contactos
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No se encontraron contactos en esta sesión
            </p>
          </div>
        )}

        {contactsData && contactsData.contacts.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {contactsData.total_count} contactos encontrados
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contactsData.contacts.map((contact: Contact) => (
                <Card key={contact.id} hover>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {contact.first_name} {contact.last_name || ''}
                      </h3>

                      {contact.username && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          @{contact.username}
                        </p>
                      )}

                      {contact.phone && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="w-3 h-3" />
                          <span>{contact.phone}</span>
                        </div>
                      )}

                      {contact.status && (
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              contact.status.toLowerCase() === 'online'
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            }`}
                          />
                          <span className={getStatusColor(contact.status)}>
                            {contact.status === 'online' ? 'En línea' : contact.status}
                          </span>
                        </div>
                      )}

                      {contact.last_seen_at && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatLastSeen(contact.last_seen_at)}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-3">
                        {contact.is_mutual && (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <UserCheck className="w-3 h-3" />
                            <span>Mutuo</span>
                          </div>
                        )}
                        {contact.is_blocked && (
                          <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <UserX className="w-3 h-3" />
                            <span>Bloqueado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
