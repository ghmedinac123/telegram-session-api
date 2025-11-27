import { useState } from 'react'
import { Button, Input, Alert } from '@/components/common'
import { useSendFileMessage } from '@/hooks'
import { ApiException } from '@/types'
import { FileText, CheckCircle } from 'lucide-react'

interface SendFileFormProps {
  sessionId: string
}

export const SendFileForm = ({ sessionId }: SendFileFormProps) => {
  const [to, setTo] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendFileMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!to.trim() || !fileUrl.trim()) {
      setError('Destinatario y URL del archivo son requeridos')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: { to: to.trim(), file_url: fileUrl.trim(), caption: caption.trim() || undefined },
      })

      setSuccess(`Archivo enviado exitosamente. Job ID: ${response.job_id}`)
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
        label="URL del Archivo"
        type="url"
        placeholder="https://example.com/document.pdf"
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <Input
        label="Caption (Opcional)"
        type="text"
        placeholder="Descripción del archivo..."
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
        <FileText className="w-4 h-4" />
        Enviar Archivo
      </Button>
    </form>
  )
}
