import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '@/api'
import { User, AuthContextType } from '@/types'
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '@/config/constants'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Cargar datos del usuario desde localStorage al iniciar
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    const storedUser = localStorage.getItem(USER_KEY)

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }

    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await authApi.login({ username, password })

      // Guardar en localStorage
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token)
      localStorage.setItem(USER_KEY, JSON.stringify(response.user))

      // Actualizar estado
      setToken(response.access_token)
      setUser(response.user)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true)
    try {
      await authApi.register({ username, email, password })
      // Después del registro, hacer login automático
      await login(username, password)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      // Limpiar todo
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setToken(null)
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
