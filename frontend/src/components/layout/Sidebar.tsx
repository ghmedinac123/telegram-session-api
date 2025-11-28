import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Webhook,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Send,
  User,
  LogOut,
  Zap,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts'
import { useSessions } from '@/hooks'
import { useSidebar } from './Layout'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  collapsed: boolean
  badge?: number
  onClick?: () => void
}

const NavItem = ({ to, icon, label, collapsed, badge, onClick }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
        ${isActive
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="font-medium flex-1">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-full">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

interface SessionNavItemProps {
  session: {
    id: string
    session_name: string
    telegram_username?: string
    is_active: boolean
  }
  collapsed: boolean
  onNavigate?: () => void
  isExpanded: boolean
  onToggle: () => void
}

const SessionNavItem = ({ session, collapsed, onNavigate, isExpanded, onToggle }: SessionNavItemProps) => {
  const location = useLocation()
  const isActive = location.pathname.includes(session.id)

  if (collapsed) {
    return (
      <NavLink
        to={`/messages/${session.id}`}
        onClick={onNavigate}
        className={`
          flex items-center justify-center p-2 rounded-lg transition-all duration-200
          ${isActive
            ? 'bg-primary-100 dark:bg-primary-900/30'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
        title={session.session_name}
      >
        <div className={`w-2 h-2 rounded-full ${session.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
      </NavLink>
    )
  }

  return (
    <div className="space-y-1">
      {/* Session header - clickable to expand/collapse */}
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
          ${isActive
            ? 'bg-primary-50 dark:bg-primary-900/20'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className={`text-sm font-medium truncate flex-1 text-left ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {session.session_name}
        </span>
        {session.is_active && (
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Expandable menu items */}
      {session.is_active && isExpanded && (
        <div className="pl-5 space-y-0.5 overflow-hidden animate-accordion-down">
          <NavLink
            to={`/messages/${session.id}`}
            onClick={onNavigate}
            className={({ isActive }) => `
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Mensajes</span>
          </NavLink>
          <NavLink
            to={`/chats/${session.id}`}
            onClick={onNavigate}
            className={({ isActive }) => `
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
          </NavLink>
          <NavLink
            to={`/contacts/${session.id}`}
            onClick={onNavigate}
            className={({ isActive }) => `
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contactos</span>
          </NavLink>
          <NavLink
            to={`/webhooks/${session.id}`}
            onClick={onNavigate}
            className={({ isActive }) => `
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks</span>
          </NavLink>
        </div>
      )}
    </div>
  )
}

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const { user, logout } = useAuth()
  const { data: sessions } = useSessions()
  const { isOpen, setIsOpen } = useSidebar()
  const location = useLocation()

  const activeSessions = sessions?.filter(s => s.is_active).length || 0

  // Close sidebar on mobile when navigating
  const handleMobileNavigate = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false)
    }
  }

  // Toggle session expansion
  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  // Auto-expand session if currently viewing it
  const isSessionExpanded = (sessionId: string) => {
    if (location.pathname.includes(sessionId)) {
      return true
    }
    return expandedSessions.has(sessionId)
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        flex flex-col transition-all duration-300 z-40
        ${collapsed ? 'w-[72px]' : 'w-64'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">Telegram</h1>
              <p className="text-xs text-gray-500 dark:text-gray-500">API Manager</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center mx-auto">
            <Zap className="w-5 h-5 text-white" />
          </div>
        )}
        {/* Close button for mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <NavItem
          to="/dashboard"
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Dashboard"
          collapsed={collapsed}
          badge={activeSessions}
          onClick={handleMobileNavigate}
        />

        {/* Sessions Section */}
        {sessions && sessions.length > 0 && (
          <div className="pt-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
                Sesiones ({sessions.length})
              </p>
            )}
            <div className="space-y-1">
              {sessions.map((session) => (
                <SessionNavItem
                  key={session.id}
                  session={session}
                  collapsed={collapsed}
                  onNavigate={handleMobileNavigate}
                  isExpanded={isSessionExpanded(session.id)}
                  onToggle={() => toggleSession(session.id)}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <NavItem
          to="/profile"
          icon={<User className="w-5 h-5" />}
          label="Perfil"
          collapsed={collapsed}
          onClick={handleMobileNavigate}
        />
        <NavItem
          to="/settings"
          icon={<Settings className="w-5 h-5" />}
          label="Configuracion"
          collapsed={collapsed}
          onClick={handleMobileNavigate}
        />

        {/* User info */}
        {user && !collapsed && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors
            text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Cerrar sesion</span>}
        </button>
      </div>

      {/* Collapse toggle - only visible on desktop */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        )}
      </button>
    </aside>
  )
}
