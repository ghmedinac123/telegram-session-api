import { useState } from 'react'
import { Button, Input, Alert } from '@/components/common'
import { useSendTextMessage } from '@/hooks'
import { useToast } from '@/contexts'
import { ApiException } from '@/types'
import { Send } from 'lucide-react'

interface SendTextFormProps {
  sessionId: string
}

export const SendTextForm = ({ sessionId }: SendTextFormProps) => {
  const toast = useToast()
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendTextMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!to.trim()) {
      setError('El destinatario es requerido')
      return
    }

    if (!text.trim()) {
      setError('El mensaje es requerido')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: { to: to.trim(), text: text.trim() },
      })

      toast.success('Mensaje enviado', `Job ID: ${response.job_id}`)
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

      <Input
        label="Destinatario"
        type="text"
        placeholder="@username, +573001234567 o ID de chat"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mensaje
        </label>
        <textarea
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
          rows={6}
          placeholder="Escribe tu mensaje aqui..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sendMessage.isPending}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {text.length} caracteres
        </p>
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={sendMessage.isPending}
        fullWidth
        className="h-12"
      >
        <Send className="w-4 h-4 mr-2" />
        Enviar Mensaje
      </Button>
    </form>
  )
}
