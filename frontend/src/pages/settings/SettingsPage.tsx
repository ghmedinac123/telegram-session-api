import { useState } from 'react'
import {
  Moon,
  Sun,
  Bell,
  Globe,
  Palette,
  Shield,
  Database,
  Trash2,
  Download,
  Monitor,
} from 'lucide-react'
import { Layout } from '@/components/layout'
import { Card, Button, Alert } from '@/components/common'
import { useTheme, useToast } from '@/contexts'

interface SettingItemProps {
  icon: React.ReactNode
  title: string
  description: string
  action: React.ReactNode
}

const SettingItem = ({ icon, title, description, action }: SettingItemProps) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
    <div className="flex items-center gap-4">
      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {icon}
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
    {action}
  </div>
)

export const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme()
  const toast = useToast()

  const [notifications, setNotifications] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const handleExportData = () => {
    toast.info('Exportando datos', 'Preparando archivo de exportacion...')
    setTimeout(() => {
      toast.success('Exportacion completada', 'El archivo se ha descargado')
    }, 2000)
  }

  const handleClearCache = () => {
    localStorage.clear()
    toast.success('Cache limpiada', 'Los datos en cache han sido eliminados')
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuracion</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Personaliza tu experiencia
          </p>
        </div>

        {/* Appearance */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Apariencia
          </h3>
          <div className="space-y-3">
            <SettingItem
              icon={theme === 'dark' ? <Moon className="w-5 h-5 text-primary-600" /> : <Sun className="w-5 h-5 text-primary-600" />}
              title="Tema"
              description={theme === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado'}
              action={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => theme !== 'light' && toggleTheme()}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'light'
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => theme !== 'dark' && toggleTheme()}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                  </button>
                  <button
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                  >
                    <Monitor className="w-5 h-5" />
                  </button>
                </div>
              }
            />
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificaciones
          </h3>
          <div className="space-y-3">
            <SettingItem
              icon={<Bell className="w-5 h-5 text-primary-600" />}
              title="Notificaciones push"
              description="Recibe alertas de nuevos mensajes"
              action={
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={() => setNotifications(!notifications)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              }
            />

            <SettingItem
              icon={<Globe className="w-5 h-5 text-primary-600" />}
              title="Auto-actualizar"
              description="Actualizar datos automaticamente"
              action={
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={() => setAutoRefresh(!autoRefresh)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              }
            />
          </div>
        </Card>

        {/* Data */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Datos
          </h3>
          <div className="space-y-3">
            <SettingItem
              icon={<Download className="w-5 h-5 text-primary-600" />}
              title="Exportar datos"
              description="Descarga una copia de tus datos"
              action={
                <Button variant="secondary" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              }
            />

            <SettingItem
              icon={<Trash2 className="w-5 h-5 text-red-600" />}
              title="Limpiar cache"
              description="Eliminar datos almacenados localmente"
              action={
                <Button variant="danger" onClick={handleClearCache}>
                  Limpiar
                </Button>
              }
            />
          </div>
        </Card>

        {/* API Info */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Informacion de la API
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Version</p>
              <p className="font-mono font-medium text-gray-900 dark:text-white">v1.0.0</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Endpoint</p>
              <p className="font-mono font-medium text-gray-900 dark:text-white text-sm">/api/v1</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Documentacion</p>
              <a
                href="/docs/"
                target="_blank"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Swagger UI
              </a>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado</p>
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Operativo
              </span>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-red-200 dark:border-red-900/50">
          <h3 className="font-semibold text-red-600 dark:text-red-400 mb-4">
            Zona de peligro
          </h3>
          <Alert variant="error">
            <p className="text-sm">
              Las siguientes acciones son irreversibles. Procede con precaucion.
            </p>
          </Alert>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="danger">
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar todas las sesiones
            </Button>
            <Button variant="danger">
              Eliminar cuenta
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
