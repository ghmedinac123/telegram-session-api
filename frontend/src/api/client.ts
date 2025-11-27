import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL, AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/config/constants'
import { ApiResponse, ApiException } from '@/types'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor - añade el token a cada petición
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - maneja errores globalmente
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse>) => {
        if (error.response) {
          const { status, data } = error.response

          // Si el token expiró, redirigir al login
          if (status === 401) {
            localStorage.removeItem(AUTH_TOKEN_KEY)
            localStorage.removeItem(REFRESH_TOKEN_KEY)
            window.location.href = '/login'
          }

          // Crear excepción con información del error
          throw new ApiException(
            data.error?.code || 'UNKNOWN_ERROR',
            data.error?.message || 'Error desconocido',
            status,
            data.error?.details
          )
        }

        throw new ApiException(
          'NETWORK_ERROR',
          'Error de conexión. Verifica tu internet.',
          0
        )
      }
    )
  }

  public async get<T>(url: string): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url)
    return response.data.data as T
  }

  public async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data)
    return response.data.data as T
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data)
    return response.data.data as T
  }

  public async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url)
    return response.data.data as T
  }
}

export const apiClient = new ApiClient()
