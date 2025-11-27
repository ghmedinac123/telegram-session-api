import { useState } from 'react'
import { Button, Input, Alert } from '@/components/common'
import { useSendVideoMessage } from '@/hooks'
import { ApiException } from '@/types'
import { Video, CheckCircle } from 'lucide-react'

interface SendVideoFormProps {
  sessionId: string
}

export const SendVideoForm = ({ sessionId }: SendVideoFormProps) => {
  const [to, setTo] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendVideoMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!to.trim() || !videoUrl.trim()) {
      setError('Destinatario y URL del video son requeridos')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: { to: to.trim(), video_url: videoUrl.trim(), caption: caption.trim() || undefined },
      })

      setSuccess(`Video enviado exitosamente. Job ID: ${response.job_id}`)
      setTo('')
      setVideoUrl('')
      setCaption('')
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message)
      } else {
        setError('Error al enviar el video')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {success && (
        <Alert variant="success">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        </Alert>
      )}

      <Input
        label="Destinatario"
        type="text"
        placeholder="@username o +573001234567"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <Input
        label="URL del Video"
        type="url"
        placeholder="https://example.com/video.mp4"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <Input
        label="Caption (Opcional)"
        type="text"
        placeholder="Descripción del video..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <Button
        type="submit"
        variant="primary"
        isLoading={sendMessage.isPending}
        className="flex items-center gap-2"
      >
        <Video className="w-4 h-4" />
        Enviar Video
      </Button>
    </form>
  )
}
