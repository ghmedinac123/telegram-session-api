import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Lock, User, Zap, ArrowRight, Shield, Smartphone, Globe } from 'lucide-react'
import { useAuth } from '@/contexts'
import { Button, Input, Card, Alert } from '@/components/common'
import { ApiException } from '@/types'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message)
      } else {
        setError('Error al iniciar sesion. Intenta nuevamente.')
      }
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-600 to-primary-800 p-12 items-center justify-center relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="max-w-md text-white space-y-8 relative z-10">
          <div>
            <h2 className="text-4xl font-bold mb-4">
              Telegram API Manager
            </h2>
            <p className="text-lg text-primary-100">
              La forma mas facil de gestionar multiples sesiones de Telegram desde una sola interfaz.
            </p>
          </div>

          <div className="space-y-6">
            {[
              { icon: Shield, title: 'Seguro', desc: 'Datos cifrados con AES-256' },
              { icon: Smartphone, title: 'Multi-sesion', desc: 'Gestiona multiples cuentas' },
              { icon: Globe, title: 'API REST', desc: 'Integracion con cualquier sistema' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-primary-100">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-6 shadow-xl shadow-primary-600/30">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Bienvenido
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Inicia sesion para acceder a tu cuenta
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="error">
                  {error}
                </Alert>
              )}

              <div className="relative">
                <User className="absolute left-3 top-9 w-5 h-5 text-gray-400" />
                <Input
                  label="Usuario"
                  type="text"
                  placeholder="tu_usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  className="pl-10"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-9 w-5 h-5 text-gray-400" />
                <Input
                  label="Contrasena"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pl-10"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-600 dark:text-gray-400">Recordarme</span>
                </label>
                <a href="#" className="text-primary-600 hover:text-primary-500 font-medium">
                  Olvidaste tu contrasena?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                className="h-12 text-base"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Iniciar Sesion
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            No tienes cuenta?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
              Registrate gratis
              <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </p>

          <p className="text-center text-xs text-gray-500 dark:text-gray-600">
            Telegram API Manager v1.0
          </p>
        </div>
      </div>
    </div>
  )
}
