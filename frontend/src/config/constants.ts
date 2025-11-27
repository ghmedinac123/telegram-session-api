export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const AUTH_TOKEN_KEY = 'auth_token'
export const REFRESH_TOKEN_KEY = 'refresh_token'
export const USER_KEY = 'user_data'

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  SESSIONS: '/sessions',
} as const

export const AUTH_STATES = {
  PENDING: 'pending',
  CODE_SENT: 'code_sent',
  PASSWORD_REQUIRED: 'password_required',
  AUTHENTICATED: 'authenticated',
  FAILED: 'failed',
} as const

export const AUTH_METHODS = {
  SMS: 'sms',
  QR: 'qr',
} as const
