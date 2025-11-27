import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Mail, Lock, User, Zap, ArrowRight, Check } from 'lucide-react'
import { useAuth } from '@/contexts'
import { Button, Input, Card, Alert } from '@/components/common'
import { ApiException } from '@/types'

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { register, isLoading } = useAuth()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')

  const passwordRequirements = [
    { text: 'Al menos 8 caracteres', met: formData.password.length >= 8 },
    { text: 'Al menos una mayuscula', met: /[A-Z]/.test(formData.password) },
    { text: 'Al menos un numero', met: /[0-9]/.test(formData.password) },
  ]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.username || !formData.email || !formData.password) {
      setError('Por favor completa todos los campos')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden')
      return
    }

    if (formData.password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres')
      return
    }

    try {
      await register(formData.username, formData.email, formData.password)
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message)
      } else {
        setError('Error al crear la cuenta. Intenta nuevamente.')
      }
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-6 shadow-xl shadow-primary-600/30">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Crear cuenta
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Registrate para gestionar tus sesiones de Telegram
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
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={isLoading}
                  autoComplete="username"
                  className="pl-10"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-9 w-5 h-5 text-gray-400" />
                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                  autoComplete="email"
                  className="pl-10"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-9 w-5 h-5 text-gray-400" />
                <Input
                  label="Contrasena"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="pl-10"
                />
              </div>

              {/* Password requirements */}
              {formData.password && (
                <div className="space-y-2">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        req.met ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        {req.met && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-3 top-9 w-5 h-5 text-gray-400" />
                <Input
                  label="Confirmar contrasena"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="pl-10"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isLoading}
                className="h-12 text-base"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Crear cuenta
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
              Inicia sesion
              <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Features */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-600 to-primary-800 p-12 items-center justify-center">
        <div className="max-w-md text-white space-y-8">
          <h2 className="text-3xl font-bold">
            Potencia tu comunicacion con Telegram
          </h2>
          <div className="space-y-6">
            {[
              { title: 'Multi-sesion', desc: 'Gestiona multiples cuentas de Telegram simultaneamente' },
              { title: 'Mensajes masivos', desc: 'Envia mensajes a multiples destinatarios con delay' },
              { title: 'Webhooks', desc: 'Recibe eventos en tiempo real via webhooks' },
              { title: 'API REST', desc: 'Integracion facil con cualquier sistema' },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5" />
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
    </div>
  )
}
