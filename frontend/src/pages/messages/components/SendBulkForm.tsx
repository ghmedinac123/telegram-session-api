import { useState } from 'react'
import { Button, Input, Alert } from '@/components/common'
import { useSendBulkMessage } from '@/hooks'
import { ApiException } from '@/types'
import { Users, CheckCircle, Plus, X } from 'lucide-react'

interface SendBulkFormProps {
  sessionId: string
}

export const SendBulkForm = ({ sessionId }: SendBulkFormProps) => {
  const [recipients, setRecipients] = useState<string[]>([''])
  const [text, setText] = useState('')
  const [delayMs, setDelayMs] = useState('3000')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const sendMessage = useSendBulkMessage()

  const handleAddRecipient = () => {
    setRecipients([...recipients, ''])
  }

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index))
  }

  const handleRecipientChange = (index: number, value: string) => {
    const newRecipients = [...recipients]
    newRecipients[index] = value
    setRecipients(newRecipients)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validRecipients = recipients.filter((r) => r.trim())

    if (validRecipients.length === 0 || !text.trim()) {
      setError('Debes agregar al menos un destinatario y un mensaje')
      return
    }

    try {
      const response = await sendMessage.mutateAsync({
        sessionId,
        data: {
          recipients: validRecipients.map((r) => r.trim()),
          text: text.trim(),
          delay_ms: parseInt(delayMs) || 3000,
        },
      })

      setSuccess(`Mensajes masivos enviados: ${response.length} mensajes en cola`)
      setRecipients([''])
      setText('')
      setDelayMs('3000')
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message)
      } else {
        setError('Error al enviar los mensajes')
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Destinatarios
          </label>
          <button
            type="button"
            onClick={handleAddRecipient}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        {recipients.map((recipient, index) => (
          <div key={index} className="flex gap-2">
            <Input
              type="text"
              placeholder="@username o +573001234567"
              value={recipient}
              onChange={(e) => handleRecipientChange(index, e.target.value)}
              disabled={sendMessage.isPending}
            />
            {recipients.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveRecipient(index)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                disabled={sendMessage.isPending}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Mensaje
        </label>
        <textarea
          className="input"
          rows={6}
          placeholder="Mensaje que se enviará a todos los destinatarios..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sendMessage.isPending}
        />
      </div>

      <Input
        label="Delay entre mensajes (ms)"
        type="number"
        placeholder="3000"
        value={delayMs}
        onChange={(e) => setDelayMs(e.target.value)}
        disabled={sendMessage.isPending}
      />

      <Alert variant="warning">
        <p className="text-sm">
          Los mensajes se enviarán con un delay de {parseInt(delayMs) / 1000} segundos entre cada uno
          para evitar límites de Telegram.
        </p>
      </Alert>

      <Button
        type="submit"
        variant="primary"
        isLoading={sendMessage.isPending}
        className="flex items-center gap-2"
      >
        <Users className="w-4 h-4" />
        Enviar a {recipients.filter((r) => r.trim()).length} Destinatarios
      </Button>
    </form>
  )
}
