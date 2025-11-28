import { ReactNode, useState, createContext, useContext, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface SidebarContextType {
  // Mobile: open/close sidebar
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
  // Desktop & Mobile: collapse to icons only
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggleCollapse: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a Layout')
  }
  return context
}

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Restore from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    }
    return false
  })

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const sidebarContextValue: SidebarContextType = {
    isOpen: sidebarOpen,
    setIsOpen: setSidebarOpen,
    toggle: () => setSidebarOpen(prev => !prev),
    isCollapsed: sidebarCollapsed,
    setIsCollapsed: setSidebarCollapsed,
    toggleCollapse: () => setSidebarCollapsed(prev => !prev),
  }

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        {/* Overlay for mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Main content - margin adapts to sidebar collapsed state */}
        <div className={`
          transition-all duration-300
          ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}
        `}>
          <Header />
          <main className="p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}

// Layout simple sin sidebar (para auth pages)
export const AuthLayout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {children}
    </div>
  )
}
