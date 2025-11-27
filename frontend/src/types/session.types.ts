export interface TelegramSession {
  id: string
  user_id: string
  phone_number?: string
  api_id: number
  session_name: string
  auth_state: string
  telegram_user_id?: number
  telegram_username?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSessionRequest {
  phone?: string
  api_id: number
  api_hash: string
  session_name: string
  auth_method?: 'sms' | 'qr'
}

export interface CreateSessionResponse {
  session: TelegramSession
  phone_code_hash?: string
  qr_image_base64?: string
  message?: string
  next_step?: string
}

export interface VerifyCodeRequest {
  code: string
}

export interface SessionStatus {
  session: TelegramSession
  status: 'waiting' | 'failed' | 'authenticated'
  message?: string
}
