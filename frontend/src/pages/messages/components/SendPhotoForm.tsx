import { useState } from 'react'
import { Button, Input, Alert, FileUpload } from '@/components/common'
import { useSendPhotoMessage } from '@/hooks'
import { useToast } from '@/contexts'
import { ApiException } from '@/types'
import { Send } from 'lucide-react'

interface SendPhotoFormProps {
  sessionId: string
}

export const SendPhotoForm = ({ sessionId }: SendPhotoFormProps) => {
  const toast = useToast()
  const [to, setTo] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendPhotoMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!to.trim()) {
      setError('El destinatario es requerido')
      return
    }

    if (!photoUrl.trim()) {
      setError('La imagen es requerida')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: { to: to.trim(), photo_url: photoUrl.trim(), caption: caption.trim() || undefined },
      })

      toast.success('Foto enviada', `Job ID: ${response.job_id}`)
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

      <Input
        label="Destinatario"
        type="text"
        placeholder="@username, +573001234567 o ID de chat"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <FileUpload
        type="image"
        label="Imagen"
        value={photoUrl}
        onChange={setPhotoUrl}
        placeholder="https://tu-servidor.com/imagen.jpg"
        disabled={sendMessage.isPending}
      />

      <Input
        label="Caption (Opcional)"
        type="text"
        placeholder="Descripcion de la foto..."
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
        Enviar Foto
      </Button>
    </form>
  )
}
