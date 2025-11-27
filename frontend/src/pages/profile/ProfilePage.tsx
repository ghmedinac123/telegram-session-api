import { useState } from 'react'
import {
  User,
  Mail,
  Shield,
  Calendar,
  Edit2,
  Save,
  X,
  Key,
  Smartphone,
  Activity,
} from 'lucide-react'
import { Layout } from '@/components/layout'
import { Card, Button, Input } from '@/components/common'
import { useAuth, useToast } from '@/contexts'
import { useSessions } from '@/hooks'

export const ProfilePage = () => {
  const { user } = useAuth()
  const toast = useToast()
  const { data: sessions } = useSessions()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  })

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const activeSessions = sessions?.filter((s) => s.is_active).length || 0
  const totalSessions = sessions?.length || 0

  const handleSaveProfile = async () => {
    toast.success('Perfil actualizado', 'Los cambios han sido guardados')
    setIsEditing(false)
  }

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error('Error', 'Las contrasenas no coinciden')
      return
    }
    toast.success('Contrasena actualizada', 'Tu contrasena ha sido cambiada')
    setShowPasswordForm(false)
    setPasswordData({ current: '', new: '', confirm: '' })
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona tu informacion personal
          </p>
        </div>

        {/* Profile Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-600/20">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.username}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
                    <Shield className="w-3 h-3" />
                    {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </span>
                </div>
              </div>
            </div>

            {!isEditing ? (
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
                <Button variant="primary" onClick={handleSaveProfile}>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nombre de usuario"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <User className="w-4 h-4" />
                  Usuario
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{user?.username}</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Mail className="w-4 h-4" />
                  Email
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Shield className="w-4 h-4" />
                  Rol
                </div>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  ID
                </div>
                <p className="font-mono text-sm text-gray-900 dark:text-white">{user?.id}</p>
              </div>
            </div>
          )}
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <Smartphone className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sesiones Totales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalSessions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sesiones Activas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeSessions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cuenta</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {user?.role}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Security */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Seguridad
          </h3>

          {showPasswordForm ? (
            <div className="space-y-4">
              <Input
                label="Contrasena actual"
                type="password"
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nueva contrasena"
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                />
                <Input
                  label="Confirmar contrasena"
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowPasswordForm(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleChangePassword}>
                  Cambiar Contrasena
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Contrasena</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ultima actualizacion: Hace 30 dias
                </p>
              </div>
              <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>
                Cambiar
              </Button>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
