import { useState } from 'react'
import { Button, Input, Alert } from '@/components/common'
import { useSendAudioMessage } from '@/hooks'
import { ApiException } from '@/types'
import { Music, CheckCircle } from 'lucide-react'

interface SendAudioFormProps {
  sessionId: string
}

export const SendAudioForm = ({ sessionId }: SendAudioFormProps) => {
  const [to, setTo] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendAudioMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!to.trim() || !audioUrl.trim()) {
      setError('Destinatario y URL del audio son requeridos')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: { to: to.trim(), audio_url: audioUrl.trim(), caption: caption.trim() || undefined },
      })

      setSuccess(`Audio enviado exitosamente. Job ID: ${response.job_id}`)
      setTo('')
      setAudioUrl('')
      setCaption('')
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message)
      } else {
        setError('Error al enviar el audio')
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
        label="URL del Audio"
        type="url"
        placeholder="https://example.com/audio.mp3"
        value={audioUrl}
        onChange={(e) => setAudioUrl(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <Input
        label="Caption (Opcional)"
        type="text"
        placeholder="Descripción del audio..."
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
        <Music className="w-4 h-4" />
        Enviar Audio
      </Button>
    </form>
  )
}
