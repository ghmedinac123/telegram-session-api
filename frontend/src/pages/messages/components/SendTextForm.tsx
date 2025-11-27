import { useState } from 'react'
import { Button, Input, Alert } from '@/components/common'
import { useSendTextMessage } from '@/hooks'
import { ApiException } from '@/types'
import { Send, CheckCircle } from 'lucide-react'

interface SendTextFormProps {
  sessionId: string
}

export const SendTextForm = ({ sessionId }: SendTextFormProps) => {
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendTextMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!to.trim() || !text.trim()) {
      setError('Todos los campos son requeridos')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: { to: to.trim(), text: text.trim() },
      })

      setSuccess(`Mensaje enviado exitosamente. Job ID: ${response.job_id}`)
      setTo('')
      setText('')
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message)
      } else {
        setError('Error al enviar el mensaje')
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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Mensaje
        </label>
        <textarea
          className="input"
          rows={6}
          placeholder="Escribe tu mensaje aquí..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sendMessage.isPending}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={sendMessage.isPending}
        className="flex items-center gap-2"
      >
        <Send className="w-4 h-4" />
        Enviar Mensaje
      </Button>
    </form>
  )
}
