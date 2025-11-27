# Telegram API Manager - Frontend

Interfaz moderna y minimalista para gestionar sesiones de Telegram, construida con React 19, TypeScript, Tailwind CSS y TanStack Query.

## Caracteristicas

- **UI Moderna** - Diseno minimalista con Tailwind CSS y componentes personalizados
- **Modo Oscuro/Claro** - Tema automatico persistente con soporte del sistema
- **Responsive** - Disenado mobile-first con sidebar colapsable
- **Performance** - Optimizado con TanStack Query y lazy loading
- **Autenticacion** - JWT con rutas protegidas y refresh automatico
- **TypeScript** - Type-safe en toda la aplicacion
- **Vite 7** - Build rapido y HMR instantaneo
- **Toast Notifications** - Sistema de notificaciones contextual
- **File Upload** - Soporte para imagenes, videos, audio y archivos

## Arquitectura

```
src/
├── api/                    # API clients (axios)
│   ├── client.ts               # Cliente HTTP configurado con interceptors
│   ├── auth.api.ts             # Endpoints de autenticacion
│   ├── sessions.api.ts         # Endpoints de sesiones Telegram
│   ├── messages.api.ts         # Endpoints de mensajes (text, photo, video, audio, file, bulk)
│   ├── chats.api.ts            # Endpoints de chats y contactos
│   └── webhooks.api.ts         # Endpoints de webhooks
│
├── components/             # Componentes reutilizables
│   ├── common/                 # UI Components
│   │   ├── Alert.tsx               # Alertas (success, error, warning, info)
│   │   ├── Badge.tsx               # Badges con variantes
│   │   ├── Button.tsx              # Botones (primary, secondary, danger, ghost)
│   │   ├── Card.tsx                # Tarjetas con hover opcional
│   │   ├── FileUpload.tsx          # Upload de archivos con preview
│   │   ├── Input.tsx               # Inputs con label y error
│   │   ├── Modal.tsx               # Modal responsive con sizes
│   │   └── Tabs.tsx                # Sistema de tabs
│   ├── layout/                 # Layout Components
│   │   ├── Header.tsx              # Header con busqueda y user menu
│   │   ├── Layout.tsx              # Layout principal con sidebar
│   │   └── Sidebar.tsx             # Sidebar colapsable con navegacion
│   └── sessions/               # Session Components
│       ├── CreateSessionModal.tsx  # Modal crear sesion (SMS/QR)
│       ├── QRCodeModal.tsx         # Modal para escanear QR
│       ├── SessionCard.tsx         # Tarjeta de sesion
│       └── VerifyCodeModal.tsx     # Modal verificar codigo SMS
│
├── contexts/               # React Contexts
│   ├── AuthContext.tsx         # Estado de autenticacion global
│   ├── ThemeContext.tsx        # Tema oscuro/claro
│   └── ToastContext.tsx        # Sistema de notificaciones toast
│
├── hooks/                  # Custom hooks
│   ├── index.ts                # Re-exports
│   ├── useSessions.ts          # CRUD de sesiones con TanStack Query
│   ├── useMessages.ts          # Envio de mensajes (todos los tipos)
│   └── useChats.ts             # Chats, historial y contactos
│
├── pages/                  # Paginas principales
│   ├── auth/                   # Autenticacion
│   │   ├── LoginPage.tsx           # Login con diseno split
│   │   └── RegisterPage.tsx        # Registro de usuarios
│   ├── dashboard/              # Dashboard
│   │   ├── DashboardPage.tsx       # Vista principal con stats
│   │   └── components/
│   │       └── SessionList.tsx     # Lista de sesiones
│   ├── messages/               # Mensajeria
│   │   ├── MessagesPage.tsx        # Pagina de envio de mensajes
│   │   └── components/
│   │       ├── SendTextForm.tsx        # Enviar texto
│   │       ├── SendPhotoForm.tsx       # Enviar foto
│   │       ├── SendVideoForm.tsx       # Enviar video
│   │       ├── SendAudioForm.tsx       # Enviar audio
│   │       ├── SendFileForm.tsx        # Enviar archivo
│   │       └── SendBulkForm.tsx        # Envio masivo
│   ├── chats/                  # Chats
│   │   ├── ChatsPage.tsx           # Vista de chats
│   │   └── components/
│   │       ├── ChatList.tsx            # Lista de chats
│   │       └── ChatView.tsx            # Vista de conversacion
│   ├── contacts/               # Contactos
│   │   └── ContactsPage.tsx        # Lista de contactos
│   ├── webhooks/               # Webhooks
│   │   └── WebhooksPage.tsx        # Configuracion de webhooks
│   ├── profile/                # Perfil
│   │   └── ProfilePage.tsx         # Perfil de usuario
│   └── settings/               # Configuracion
│       └── SettingsPage.tsx        # Ajustes de la app
│
├── routes/                 # Configuracion de rutas
│   ├── ProtectedRoute.tsx      # HOC para rutas protegidas
│   └── index.tsx               # Definicion de todas las rutas
│
├── types/                  # TypeScript types
│   ├── auth.types.ts           # Tipos de autenticacion
│   ├── session.types.ts        # Tipos de sesiones
│   └── api.types.ts            # Tipos genericos de API
│
├── config/                 # Configuracion
│   └── constants.ts            # URLs, eventos webhook, tipos de archivo
│
├── utils/                  # Utilidades
│   └── upload.ts               # Validacion y procesamiento de archivos
│
└── styles/                 # Estilos globales
    └── index.css               # Tailwind + animaciones custom
```

## Instalacion

### Requisitos

- Node.js 18+
- pnpm 8+

### 1. Instalar dependencias

```bash
cd frontend
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
VITE_API_URL=/api/v1
```

### 3. Ejecutar en desarrollo

```bash
pnpm dev
```

La aplicacion estara disponible en `http://localhost:3000`

### 4. Build para produccion

```bash
pnpm build
```

Los archivos compilados estaran en `/dist`

## Scripts Disponibles

```bash
pnpm dev        # Iniciar servidor de desarrollo
pnpm build      # Compilar para produccion (tsc + vite build)
pnpm preview    # Preview del build de produccion
pnpm lint       # Ejecutar ESLint
```

## Dependencias Principales

| Paquete | Version | Proposito |
|---------|---------|-----------|
| React | 19.x | UI Library |
| TypeScript | 5.x | Type Safety |
| Vite | 7.x | Build Tool |
| React Router | 7.x | Routing |
| TanStack Query | 5.x | Data Fetching & Caching |
| Axios | 1.x | HTTP Client |
| Tailwind CSS | 4.x | Styling |
| Lucide React | 0.x | Icons |

## Componentes UI

### Button
```tsx
<Button variant="primary" isLoading={false} fullWidth>
  Click me
</Button>
// Variantes: primary, secondary, danger, ghost
```

### Input
```tsx
<Input
  label="Username"
  type="text"
  error="Error message"
  icon={<User />}
/>
```

### Card
```tsx
<Card hover onClick={() => {}}>
  Content
</Card>
```

### Alert
```tsx
<Alert variant="success">
  Success message
</Alert>
// Variantes: success, error, warning, info
```

### Modal
```tsx
<Modal isOpen={open} onClose={close} title="Titulo" size="lg">
  Content
</Modal>
// Sizes: sm, md, lg, xl
```

### FileUpload
```tsx
<FileUpload
  type="image"
  value={url}
  onChange={setUrl}
  label="Imagen"
/>
// Types: image, video, audio, file
```

### Toast (via context)
```tsx
const toast = useToast()
toast.success('Titulo', 'Mensaje')
toast.error('Error', 'Descripcion')
toast.info('Info', 'Mensaje informativo')
toast.warning('Advertencia', 'Ten cuidado')
```

## Autenticacion

El sistema usa JWT tokens con refresh tokens:

1. **Login/Register** - POST `/api/v1/auth/login` o `/api/v1/auth/register`
2. **Tokens guardados** en `localStorage`
3. **Auto-refresh** cuando el token esta por expirar
4. **Rutas protegidas** con `ProtectedRoute`
5. **Interceptor axios** anade token automaticamente

## API Integration

### Interceptors

- **Request**: Anade token JWT automaticamente a todas las peticiones
- **Response**: Maneja errores globalmente, redirige al login si 401

### TanStack Query

Todas las peticiones usan hooks personalizados con cache:

```tsx
import { useSessions, useCreateSession } from '@/hooks'

// Query con cache
const { data, isLoading, error, refetch } = useSessions()

// Mutation
const createSession = useCreateSession()
createSession.mutate(data, {
  onSuccess: () => toast.success('Exito', 'Sesion creada'),
  onError: (err) => toast.error('Error', err.message)
})
```

## Paginas Disponibles

| Ruta | Pagina | Descripcion |
|------|--------|-------------|
| `/login` | LoginPage | Inicio de sesion |
| `/register` | RegisterPage | Registro de usuario |
| `/dashboard` | DashboardPage | Panel principal con sesiones |
| `/messages/:sessionId` | MessagesPage | Envio de mensajes |
| `/chats/:sessionId` | ChatsPage | Ver chats y conversaciones |
| `/contacts/:sessionId` | ContactsPage | Lista de contactos |
| `/webhooks/:sessionId` | WebhooksPage | Configurar webhooks |
| `/profile` | ProfilePage | Perfil de usuario |
| `/settings` | SettingsPage | Configuracion de la app |

## Tema Oscuro/Claro

El tema se guarda automaticamente en `localStorage` y respeta las preferencias del sistema:

```tsx
import { useTheme } from '@/contexts'

const { theme, toggleTheme } = useTheme()
// theme: 'light' | 'dark'
```

## Responsive Design

Disenado mobile-first con breakpoints de Tailwind:

- `sm`: 640px - Moviles grandes
- `md`: 768px - Tablets
- `lg`: 1024px - Desktop
- `xl`: 1280px - Desktop grande

El sidebar se colapsa automaticamente en pantallas pequenas.

## Webhooks

Eventos disponibles para configurar:

- `new_message` - Nuevo mensaje recibido
- `message_edited` - Mensaje editado
- `message_deleted` - Mensaje eliminado
- `user_status` - Cambio de estado de usuario
- `user_typing` - Usuario escribiendo
- `chat_action` - Acciones en chat

## Estructura de Archivos Upload

```
/uploads/
├── images/     # Imagenes (jpg, png, gif, webp)
├── videos/     # Videos (mp4, webm, mov)
├── audio/      # Audio (mp3, ogg, wav)
└── files/      # Documentos (pdf, doc, docx, txt)
```

Limites de tamano:
- Imagenes: 10MB
- Videos: 50MB
- Audio: 20MB
- Archivos: 50MB

## Convenciones de Codigo

- **Components**: PascalCase (`LoginPage.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useSessions.ts`)
- **Types**: PascalCase (`SessionStatus`, `AuthContextType`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **CSS Classes**: Tailwind utilities
- **Archivos**: kebab-case para utils, PascalCase para componentes

## Licencia

MIT
