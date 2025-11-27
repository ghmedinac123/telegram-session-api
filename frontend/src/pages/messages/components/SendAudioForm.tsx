import { useState } from 'react'
import { Button, Input, Alert, FileUpload } from '@/components/common'
import { useSendAudioMessage } from '@/hooks'
import { useToast } from '@/contexts'
import { ApiException } from '@/types'
import { Send } from 'lucide-react'

interface SendAudioFormProps {
  sessionId: string
}

export const SendAudioForm = ({ sessionId }: SendAudioFormProps) => {
  const toast = useToast()
  const [to, setTo] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendAudioMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!to.trim()) {
      setError('El destinatario es requerido')
      return
    }

    if (!audioUrl.trim()) {
      setError('El audio es requerido')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: { to: to.trim(), audio_url: audioUrl.trim(), caption: caption.trim() || undefined },
      })

      toast.success('Audio enviado', `Job ID: ${response.job_id}`)
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

      <Input
        label="Destinatario"
        type="text"
        placeholder="@username, +573001234567 o ID de chat"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <FileUpload
        type="audio"
        label="Audio"
        value={audioUrl}
        onChange={setAudioUrl}
        placeholder="https://tu-servidor.com/audio.mp3"
        disabled={sendMessage.isPending}
      />

      <Input
        label="Caption (Opcional)"
        type="text"
        placeholder="Descripcion del audio..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <Button
        type="submit"
        variant="primary"
        isLoading={sendMessage.isPending}
        fullWidth
        className="h-12"
      >
        <Send className="w-4 h-4 mr-2" />
        Enviar Audio
      </Button>
    </form>
  )
}
