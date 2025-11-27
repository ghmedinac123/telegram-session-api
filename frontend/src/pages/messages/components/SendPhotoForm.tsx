import { useState } from 'react'
import { Button, Input, Alert } from '@/components/common'
import { useSendPhotoMessage } from '@/hooks'
import { ApiException } from '@/types'
import { Image, CheckCircle } from 'lucide-react'

interface SendPhotoFormProps {
  sessionId: string
}

export const SendPhotoForm = ({ sessionId }: SendPhotoFormProps) => {
  const [to, setTo] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendPhotoMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!to.trim() || !photoUrl.trim()) {
      setError('Destinatario y URL de la foto son requeridos')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: { to: to.trim(), photo_url: photoUrl.trim(), caption: caption.trim() || undefined },
      })

      setSuccess(`Foto enviada exitosamente. Job ID: ${response.job_id}`)
      setTo('')
      setPhotoUrl('')
      setCaption('')
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message)
      } else {
        setError('Error al enviar la foto')
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
        label="URL de la Foto"
        type="url"
        placeholder="https://example.com/image.jpg"
        value={photoUrl}
        onChange={(e) => setPhotoUrl(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <Input
        label="Caption (Opcional)"
        type="text"
        placeholder="Descripción de la foto..."
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
        <Image className="w-4 h-4" />
        Enviar Foto
      </Button>
    </form>
  )
}
