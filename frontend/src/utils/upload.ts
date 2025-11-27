import { ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from '@/config/constants'

export type FileType = 'image' | 'video' | 'audio' | 'file'

interface UploadResult {
  success: boolean
  url?: string
  error?: string
  filename?: string
}

/**
 * Valida el archivo antes de subir
 */
export const validateFile = (file: File, type: FileType): { valid: boolean; error?: string } => {
  const allowedTypes = ALLOWED_FILE_TYPES[type]
  const maxSize = MAX_FILE_SIZES[type]

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`,
    }
  }

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo permitido (${maxMB}MB)`,
    }
  }

  return { valid: true }
}

/**
 * Genera un nombre único para el archivo
 */
const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')
  return `${baseName}_${timestamp}_${random}.${extension}`
}

/**
 * Convierte un archivo a Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Simula la subida de archivo y devuelve la URL pública
 * En producción, esto debería subir al servidor
 */
export const uploadFile = async (file: File, type: FileType): Promise<UploadResult> => {
  try {
    // Validar archivo
    const validation = validateFile(file, type)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Generar nombre único
    const filename = generateUniqueFilename(file.name)

    // Determinar la carpeta según el tipo
    const folder = type === 'image' ? 'images' : type === 'video' ? 'videos' : type === 'audio' ? 'audio' : 'files'

    // En este caso, como no tenemos un endpoint de upload en el backend,
    // usaremos una estrategia de base64 para archivos pequeños
    // o la URL pública si el archivo ya está en línea

    // Para desarrollo: convertir a base64 data URL (funciona para archivos pequeños)
    // En producción deberías implementar un endpoint de upload real
    const base64 = await fileToBase64(file)

    // Si el archivo es muy grande para base64, retornar error con instrucción
    if (base64.length > 5 * 1024 * 1024) { // 5MB en base64
      return {
        success: false,
        error: 'Archivo muy grande. Por favor, sube el archivo a un servidor externo y usa la URL directa.',
      }
    }

    // Para archivos pequeños, podemos usar el data URL
    // En producción, esto sería la URL del servidor con la carpeta correspondiente
    void folder // Acknowledge folder for future server upload implementation

    return {
      success: true,
      url: base64, // Usar base64 como fallback
      filename,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al subir el archivo',
    }
  }
}

/**
 * Formatea el tamaño del archivo para mostrar
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Obtiene el icono apropiado para el tipo de archivo
 */
export const getFileTypeIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('video/')) return 'Video'
  if (mimeType.startsWith('audio/')) return 'Music'
  if (mimeType === 'application/pdf') return 'FileText'
  return 'File'
}

/**
 * Verifica si una URL es válida
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Extrae la extensión de un archivo de una URL
 */
export const getFileExtension = (url: string): string => {
  try {
    const pathname = new URL(url).pathname
    const extension = pathname.split('.').pop()
    return extension || ''
  } catch {
    return ''
  }
}
