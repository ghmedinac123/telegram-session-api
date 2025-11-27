import { apiClient } from './client'
import { LoginRequest, LoginResponse, User } from '@/types'

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login', credentials)
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
