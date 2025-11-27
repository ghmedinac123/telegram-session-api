import { apiClient } from './client'
import { LoginRequest, LoginResponse, User, RegisterRequest } from '@/types'

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login', credentials)
  },

  register: async (data: RegisterRequest): Promise<User> => {
    return apiClient.post<User>('/auth/register', data)
  },

  logout: async (refreshToken: string): Promise<void> => {
    return apiClient.post<void>('/auth/logout', { refresh_token: refreshToken })
  },

  getMe: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me')
  },

  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/refresh', { refresh_token: refreshToken })
  },
}
