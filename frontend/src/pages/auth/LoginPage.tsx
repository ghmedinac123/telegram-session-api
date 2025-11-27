import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
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
        setError('Error al iniciar sesión. Intenta nuevamente.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bienvenido
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Inicia sesión para gestionar tus sesiones de Telegram
          </p>
        </div>

        <Card className="animate-slide-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            <Input
              label="Usuario"
              type="text"
              placeholder="ghmedinac"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
            >
              <LogIn className="w-4 h-4 mr-2 inline" />
              Iniciar Sesión
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Telegram API Manager v1.0
        </p>
      </div>
    </div>
  )
}
