import { ExternalLink, Key, Smartphone, Check } from 'lucide-react'
import { Alert, Badge } from '@/components/common'

export const TelegramGuide = () => {
  return (
    <div className="space-y-6">
      <Alert variant="info">
        <div className="space-y-2">
          <p className="font-semibold">¿Qué necesitas?</p>
          <p className="text-sm">
            Para crear una sesión de Telegram necesitas obtener tus credenciales de API
            desde el sitio oficial de Telegram.
          </p>
        </div>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
            <span className="text-primary-600 dark:text-primary-400 font-bold">1</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Accede a Telegram API
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Ve a{' '}
              <a
                href="https://my.telegram.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
              >
                my.telegram.org
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <Badge variant="info">
              <Smartphone className="w-3 h-3 mr-1 inline" />
              Necesitas tu número de teléfono de Telegram
            </Badge>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
            <span className="text-primary-600 dark:text-primary-400 font-bold">2</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Inicia sesión
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ingresa tu número de teléfono y el código que recibirás por SMS o Telegram.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
            <span className="text-primary-600 dark:text-primary-400 font-bold">3</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Ve a "API development tools"
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              En el menú principal, haz clic en "API development tools".
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
            <span className="text-primary-600 dark:text-primary-400 font-bold">4</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Crea una aplicación
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Completa el formulario con estos datos:
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>App title:</strong> Tu Aplicación (ej: "Mi Bot Telegram")</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Short name:</strong> Nombre corto (ej: "mibot")</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span><strong>Platform:</strong> Selecciona "Other"</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Copia tus credenciales
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Una vez creada la aplicación, verás:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    API ID
                  </span>
                </div>
                <code className="text-sm font-mono text-gray-900 dark:text-white">
                  12345678
                </code>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    API Hash
                  </span>
                </div>
                <code className="text-sm font-mono text-gray-900 dark:text-white">
                  abc123def456...
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Alert variant="warning">
        <div className="space-y-2">
          <p className="font-semibold text-sm">⚠️ Importante</p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>Guarda estas credenciales de forma segura</li>
            <li>No las compartas con nadie</li>
            <li>Puedes usar las mismas credenciales para múltiples sesiones</li>
          </ul>
        </div>
      </Alert>
    </div>
  )
}
