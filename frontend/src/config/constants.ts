export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const AUTH_TOKEN_KEY = 'auth_token'
export const REFRESH_TOKEN_KEY = 'refresh_token'
export const USER_KEY = 'user_data'

// URL base del frontend para archivos públicos
export const FRONTEND_URL = 'https://frontend.telegram-api.fututel.com'

// URL base para uploads
export const UPLOADS_BASE_URL = `${FRONTEND_URL}/uploads`

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  SESSIONS: '/sessions',
  MESSAGES: '/messages',
  CHATS: '/chats',
  CONTACTS: '/contacts',
  WEBHOOKS: '/webhooks',
  PROFILE: '/profile',
  SETTINGS: '/settings',
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

// Tipos de archivo permitidos
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp3'],
  file: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
}

// Tamaños máximos (en bytes)
export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
  audio: 20 * 1024 * 1024, // 20MB
  file: 50 * 1024 * 1024,  // 50MB
}

// Eventos de webhook disponibles
export const WEBHOOK_EVENTS = [
  { id: 'message.new', label: 'Nuevo mensaje', description: 'Cuando llega un nuevo mensaje' },
  { id: 'message.edit', label: 'Mensaje editado', description: 'Cuando se edita un mensaje' },
  { id: 'message.delete', label: 'Mensaje eliminado', description: 'Cuando se elimina un mensaje' },
  { id: 'user.online', label: 'Usuario conectado', description: 'Cuando un usuario se conecta' },
  { id: 'user.offline', label: 'Usuario desconectado', description: 'Cuando un usuario se desconecta' },
  { id: 'user.typing', label: 'Usuario escribiendo', description: 'Cuando un usuario está escribiendo' },
  { id: 'session.started', label: 'Sesión iniciada', description: 'Cuando se inicia una sesión' },
  { id: 'session.stopped', label: 'Sesión detenida', description: 'Cuando se detiene una sesión' },
  { id: 'session.error', label: 'Error de sesión', description: 'Cuando hay un error en la sesión' },
]

// Estados de sesión con colores
export const SESSION_STATE_CONFIG = {
  pending: { label: 'Pendiente', color: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
  code_sent: { label: 'Codigo enviado', color: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  password_required: { label: 'Requiere password', color: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  authenticated: { label: 'Autenticada', color: 'green', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  failed: { label: 'Fallida', color: 'red', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
}

// Tipos de chat
export const CHAT_TYPES = {
  private: { label: 'Privado', icon: 'User' },
  group: { label: 'Grupo', icon: 'Users' },
  supergroup: { label: 'Supergrupo', icon: 'Users' },
  channel: { label: 'Canal', icon: 'Radio' },
}
