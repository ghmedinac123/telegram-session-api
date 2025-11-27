import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Send, Image, Video, Music, FileText, Users, ArrowLeft } from 'lucide-react'
import { Layout } from '@/components/layout'
import { Tabs, Card, Alert } from '@/components/common'
import { SendTextForm } from './components/SendTextForm'
import { SendPhotoForm } from './components/SendPhotoForm'
import { SendVideoForm } from './components/SendVideoForm'
import { SendAudioForm } from './components/SendAudioForm'
import { SendFileForm } from './components/SendFileForm'
import { SendBulkForm } from './components/SendBulkForm'
import { useSession } from '@/hooks'
import { useNavigate } from 'react-router-dom'

export const MessagesPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { data: sessionData, isLoading } = useSession(sessionId || '')

  const [activeTab, setActiveTab] = useState('text')

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </Layout>
    )
  }

  if (!sessionData?.session.is_active) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <Alert variant="error">
            Esta sesión no está activa. Por favor, activa la sesión primero.
          </Alert>
        </div>
      </Layout>
    )
  }

  const session = sessionData.session

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Enviar Mensajes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Sesión: {session.session_name} (@{session.telegram_username})
            </p>
          </div>
        </div>

        <Card>
          <Tabs
            tabs={[
              { id: 'text', label: 'Texto', icon: <Send className="w-4 h-4" /> },
              { id: 'photo', label: 'Foto', icon: <Image className="w-4 h-4" /> },
              { id: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
              { id: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
              { id: 'file', label: 'Archivo', icon: <FileText className="w-4 h-4" /> },
              { id: 'bulk', label: 'Masivo', icon: <Users className="w-4 h-4" /> },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="p-6">
            {activeTab === 'text' && <SendTextForm sessionId={sessionId!} />}
            {activeTab === 'photo' && <SendPhotoForm sessionId={sessionId!} />}
            {activeTab === 'video' && <SendVideoForm sessionId={sessionId!} />}
            {activeTab === 'audio' && <SendAudioForm sessionId={sessionId!} />}
            {activeTab === 'file' && <SendFileForm sessionId={sessionId!} />}
            {activeTab === 'bulk' && <SendBulkForm sessionId={sessionId!} />}
          </div>
        </Card>
      </div>
    </Layout>
  )
}
