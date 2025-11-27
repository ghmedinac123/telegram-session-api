import { useState } from 'react'
import { Button, Input, Alert, FileUpload } from '@/components/common'
import { useSendFileMessage } from '@/hooks'
import { useToast } from '@/contexts'
import { ApiException } from '@/types'
import { Send } from 'lucide-react'

interface SendFileFormProps {
  sessionId: string
}

export const SendFileForm = ({ sessionId }: SendFileFormProps) => {
  const toast = useToast()
  const [to, setTo] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendFileMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!to.trim()) {
      setError('El destinatario es requerido')
      return
    }

    if (!fileUrl.trim()) {
      setError('El archivo es requerido')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: { to: to.trim(), file_url: fileUrl.trim(), caption: caption.trim() || undefined },
      })

      toast.success('Archivo enviado', `Job ID: ${response.job_id}`)
      setTo('')
      setFileUrl('')
      setCaption('')
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message)
      } else {
        setError('Error al enviar el archivo')
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
        type="file"
        label="Archivo"
        value={fileUrl}
        onChange={setFileUrl}
        placeholder="https://tu-servidor.com/documento.pdf"
        disabled={sendMessage.isPending}
      />

      <Input
        label="Caption (Opcional)"
        type="text"
        placeholder="Descripcion del archivo..."
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
        Enviar Archivo
      </Button>
    </form>
  )
}
