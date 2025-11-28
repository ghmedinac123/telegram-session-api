import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  Phone,
  Clock,
  UserCheck,
  UserX,
  Search,
  X,
  Database,
  ChevronDown,
} from 'lucide-react'
import { Layout } from '@/components/layout'
import { Button, Alert, Card } from '@/components/common'
import { useInfiniteContacts, useSession } from '@/hooks'
import { Contact } from '@/api/chats.api'

export const ContactsPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data: sessionData, isLoading: sessionLoading } = useSession(sessionId!)
  const {
    data: contactsData,
    isLoading: contactsLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteContacts(sessionId!, debouncedSearch || undefined, 50)

  const isLoading = sessionLoading || contactsLoading

  // Flatten all pages into a single array
  const contacts = useMemo(() => {
    if (!contactsData?.pages) return []
    return contactsData.pages.flatMap((page) => page.contacts)
  }, [contactsData])

  // Get total count and cache status from first page
  const totalCount = contactsData?.pages[0]?.total_count || 0
  const fromCache = contactsData?.pages[0]?.from_cache || false

  // Filter contacts locally for instant feedback
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts
    const term = searchTerm.toLowerCase()
    return contacts.filter(
      (contact) =>
        contact.first_name?.toLowerCase().includes(term) ||
        contact.last_name?.toLowerCase().includes(term) ||
        contact.username?.toLowerCase().includes(term) ||
        contact.phone?.includes(term)
    )
  }, [contacts, searchTerm])

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    }
    const observer = new IntersectionObserver(handleObserver, option)
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [handleObserver])

  if (!sessionId) {
    return (
      <Layout>
        <Alert variant="error">ID de sesion no valido</Alert>
      </Layout>
    )
  }

  if (isLoading && !contactsData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando contactos...</p>
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

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    const statusLower = status.toLowerCase()
    if (statusLower === 'online') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          En linea
        </span>
      )
    }
    return null
  }

  const formatLastSeen = (lastSeenAt?: string) => {
    if (!lastSeenAt) return null
    const date = new Date(lastSeenAt)
    // Check for zero date
    if (date.getFullYear() < 2000) return null
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Justo ahora'
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours}h`
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} dias`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  Contactos
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {session.phone_number || session.session_name}
                </p>
              </div>
            </div>

            {/* Stats badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">
                <Users className="w-4 h-4 mr-1.5" />
                {totalCount.toLocaleString()} contactos
              </span>
              {fromCache && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                  <Database className="w-4 h-4 mr-1.5" />
                  Cache
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o telefono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {filteredContacts.length} resultados para "{searchTerm}"
            </p>
          )}
        </div>

        {error && (
          <Alert variant="error" className="mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>Error al cargar los contactos. Intenta nuevamente.</span>
            </div>
          </Alert>
        )}

        {filteredContacts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'Sin resultados' : 'No hay contactos'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm
                ? `No se encontraron contactos para "${searchTerm}"`
                : 'No se encontraron contactos en esta sesion'}
            </p>
          </div>
        )}

        {filteredContacts.length > 0 && (
          <>
            {/* Contacts grid */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map((contact: Contact) => (
                <Card key={contact.id} hover className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                          contact.status?.toLowerCase() === 'online'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {contact.first_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {contact.first_name} {contact.last_name || ''}
                        </h3>
                        {getStatusBadge(contact.status)}
                      </div>

                      {contact.username && (
                        <p className="text-sm text-primary-600 dark:text-primary-400 truncate">
                          @{contact.username}
                        </p>
                      )}

                      {contact.phone && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">+{contact.phone}</span>
                        </div>
                      )}

                      {/* Status and last seen */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {contact.status && contact.status.toLowerCase() !== 'online' && (
                          <span className={`text-xs ${getStatusColor(contact.status)}`}>
                            {contact.status === 'recently' ? 'Reciente' : contact.status}
                          </span>
                        )}
                        {formatLastSeen(contact.last_seen_at) && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatLastSeen(contact.last_seen_at)}</span>
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 mt-2">
                        {contact.is_mutual && (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3" />
                            <span>Mutuo</span>
                          </div>
                        )}
                        {contact.is_blocked && (
                          <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
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

            {/* Load more / Infinite scroll trigger */}
            <div ref={loadMoreRef} className="mt-6 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Cargando mas contactos...</span>
                </div>
              ) : hasNextPage ? (
                <Button
                  variant="secondary"
                  onClick={() => fetchNextPage()}
                  className="flex items-center gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  Cargar mas
                </Button>
              ) : filteredContacts.length > 0 && contacts.length >= 50 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Has visto todos los contactos
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
