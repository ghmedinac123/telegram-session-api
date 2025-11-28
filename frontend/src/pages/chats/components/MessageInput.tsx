import { useState, useRef, useCallback } from 'react'
import {
  Send,
  Image,
  Video,
  Music,
  FileText,
  X,
  Loader2,
  Plus,
} from 'lucide-react'
import { useToast } from '@/contexts'
import {
  useSendTextMessage,
  useSendPhotoMessage,
  useSendVideoMessage,
  useSendAudioMessage,
  useSendFileMessage,
} from '@/hooks'
import { uploadFile, validateFile, formatFileSize, type FileType } from '@/utils/upload'

interface MessageInputProps {
  sessionId: string
  chatId: number
  onMessageSent?: () => void
}

interface Attachment {
  type: FileType
  file: File
  preview?: string
}

const ACCEPTED_TYPES = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  video: 'video/mp4,video/webm,video/quicktime',
  audio: 'audio/mpeg,audio/ogg,audio/wav,audio/mp3',
  file: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar',
}

export const MessageInput = ({ sessionId, chatId, onMessageSent }: MessageInputProps) => {
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachTypeRef = useRef<FileType | null>(null)

  const toast = useToast()

  const sendTextMutation = useSendTextMessage()
  const sendPhotoMutation = useSendPhotoMessage()
  const sendVideoMutation = useSendVideoMessage()
  const sendAudioMutation = useSendAudioMessage()
  const sendFileMutation = useSendFileMessage()

  const isSending =
    sendTextMutation.isPending ||
    sendPhotoMutation.isPending ||
    sendVideoMutation.isPending ||
    sendAudioMutation.isPending ||
    sendFileMutation.isPending ||
    isUploading

  const handleAttachClick = (type: FileType) => {
    attachTypeRef.current = type
    if (fileInputRef.current) {
      fileInputRef.current.accept = ACCEPTED_TYPES[type] || '*/*'
      fileInputRef.current.click()
    }
    setShowAttachMenu(false)
  }

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const type = attachTypeRef.current
      if (!type) return

      // Validate file
      const validation = validateFile(file, type)
      if (!validation.valid) {
        toast.error('Archivo no valido', validation.error || 'Error al validar')
        e.target.value = ''
        return
      }

      // Create preview for images
      let preview: string | undefined
      if (type === 'image') {
        preview = URL.createObjectURL(file)
      }

      setAttachment({ type, file, preview })
      e.target.value = '' // Reset input
    },
    [toast]
  )

  const removeAttachment = () => {
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview)
    }
    setAttachment(null)
  }

  const handleSend = async () => {
    if (!message.trim() && !attachment) return

    const to = chatId.toString()

    try {
      if (attachment) {
        setIsUploading(true)

        // Upload file
        const uploadResult = await uploadFile(attachment.file, attachment.type)

        if (!uploadResult.success || !uploadResult.url) {
          toast.error('Error de subida', uploadResult.error || 'No se pudo subir el archivo')
          setIsUploading(false)
          return
        }

        // The URL could be a base64 data URL or a server URL
        // If it's base64, construct a proper URL path
        let fileUrl = uploadResult.url

        // If the uploadFile returned a base64, we need a proper URL
        // In production with real upload endpoint, the URL would be returned from server
        if (uploadResult.url.startsWith('data:')) {
          // For base64, use the constructed URL (backend should handle base64 or we need real upload)
          // For now, let's assume the backend supports base64 or we'll show an error
          toast.warning('Aviso', 'Subiendo archivo... Por favor espera.')
        }

        // Send message with media
        const caption = message.trim() || undefined

        switch (attachment.type) {
          case 'image':
            await sendPhotoMutation.mutateAsync({
              sessionId,
              data: { to, photo_url: fileUrl, caption },
            })
            break
          case 'video':
            await sendVideoMutation.mutateAsync({
              sessionId,
              data: { to, video_url: fileUrl, caption },
            })
            break
          case 'audio':
            await sendAudioMutation.mutateAsync({
              sessionId,
              data: { to, audio_url: fileUrl, caption },
            })
            break
          case 'file':
            await sendFileMutation.mutateAsync({
              sessionId,
              data: { to, file_url: fileUrl, caption },
            })
            break
        }

        toast.success('Enviado', 'El mensaje se envio correctamente')
        removeAttachment()
      } else {
        // Send text message
        await sendTextMutation.mutateAsync({
          sessionId,
          data: { to, text: message.trim() },
        })
        toast.success('Enviado', 'Mensaje enviado')
      }

      setMessage('')
      onMessageSent?.()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error', 'No se pudo enviar el mensaje')
    } finally {
      setIsUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 bg-white dark:bg-gray-900">
      {/* Attachment Preview */}
      {attachment && (
        <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center gap-3">
            {attachment.type === 'image' && attachment.preview ? (
              <img
                src={attachment.preview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                {attachment.type === 'image' && <Image className="w-6 h-6 text-primary-600" />}
                {attachment.type === 'video' && <Video className="w-6 h-6 text-primary-600" />}
                {attachment.type === 'audio' && <Music className="w-6 h-6 text-primary-600" />}
                {attachment.type === 'file' && <FileText className="w-6 h-6 text-primary-600" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {attachment.file.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(attachment.file.size)}
              </p>
            </div>
            <button
              onClick={removeAttachment}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            disabled={isSending}
            className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {showAttachMenu ? (
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Attachment Menu */}
          {showAttachMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowAttachMenu(false)}
              />
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[160px] z-20">
                <button
                  onClick={() => handleAttachClick('image')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Image className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Imagen</span>
                </button>
                <button
                  onClick={() => handleAttachClick('video')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Video</span>
                </button>
                <button
                  onClick={() => handleAttachClick('audio')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                    <Music className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Audio</span>
                </button>
                <button
                  onClick={() => handleAttachClick('file')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Documento</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Text Input */}
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            disabled={isSending}
            rows={1}
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 max-h-32 text-sm sm:text-base"
            style={{ minHeight: '44px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isSending || (!message.trim() && !attachment)}
          className="p-2.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Hint - only show on desktop */}
      <p className="hidden sm:block mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
        Enter para enviar, Shift+Enter para nueva linea
      </p>
    </div>
  )
}
