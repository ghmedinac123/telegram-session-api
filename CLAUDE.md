# CLAUDE.md - Guia del Proyecto Telegram API

## Proposito del Proyecto

API REST en Go para gestionar sesiones de Telegram y enviar mensajes masivos. Permite autenticacion via SMS o codigo QR, con soporte para multimedia y envios bulk. Incluye frontend React moderno.

## Estructura del Proyecto

```
telegram-api/
├── cmd/api/main.go              # Entrada principal, inicializa todo
├── internal/
│   ├── config/config.go         # Carga variables de entorno
│   ├── database/database.go     # Conexiones PostgreSQL y Redis
│   ├── domain/                  # Entidades y errores de dominio
│   │   ├── errors.go            # Errores centralizados (ErrSessionNotFound, etc)
│   │   ├── user.go              # Entidad User
│   │   ├── session.go           # Entidad TelegramSession
│   │   ├── message.go           # Entidad Message
│   │   └── repository.go        # Interfaces de repositorios
│   ├── handler/                 # Controladores HTTP (Fiber)
│   │   ├── auth_handler.go      # /auth/* endpoints
│   │   ├── session_handler.go   # /sessions/* endpoints
│   │   ├── message_handler.go   # /messages/* endpoints
│   │   └── response.go          # Helpers de respuesta JSON
│   ├── middleware/              # Middlewares
│   │   ├── jwt.go               # Autenticacion JWT
│   │   ├── cors.go              # CORS
│   │   ├── logger.go            # Request logging
│   │   └── rate_limit.go        # Rate limiting
│   ├── repository/
│   │   ├── postgres/            # Implementaciones PostgreSQL
│   │   │   ├── user_repo.go
│   │   │   ├── session_repo.go
│   │   │   ├── token_repo.go
│   │   │   └── errors.go        # wrapDBError helper
│   │   └── redis/
│   │       └── cache_repo.go    # Cache para codigos QR/SMS
│   ├── service/                 # Logica de negocio
│   │   ├── auth_service.go      # Login, registro, JWT
│   │   ├── session_service.go   # Gestion sesiones Telegram
│   │   └── message_service.go   # Envio de mensajes
│   └── telegram/                # Cliente Telegram (gotd/td)
│       ├── manager.go           # Autenticacion SMS/QR
│       └── sender.go            # Envio de mensajes
├── pkg/                         # Paquetes reutilizables
│   ├── crypto/aes.go            # Cifrado AES-256-GCM
│   ├── logger/logger.go         # Zerolog wrapper
│   ├── utils/qr.go              # Generacion de QR
│   └── validator/validator.go   # Validacion de structs
├── db/
│   ├── migrations/001_initial.sql
│   └── queries/                 # SQL de referencia
├── docs/                        # Swagger generado
└── frontend/                    # Aplicacion React
    ├── src/
    │   ├── api/                 # Clientes API (axios)
    │   ├── components/          # Componentes React
    │   ├── contexts/            # React Contexts
    │   ├── hooks/               # Custom hooks
    │   ├── pages/               # Paginas
    │   ├── routes/              # Rutas
    │   ├── types/               # TypeScript types
    │   └── config/              # Configuracion
    └── dist/                    # Build de produccion
```

## Tecnologias

### Backend
- **Go 1.21+** - Lenguaje
- **Fiber v2** - Framework HTTP
- **gotd/td** - Cliente Telegram MTProto
- **pgx v5** - Driver PostgreSQL
- **go-redis v9** - Cliente Redis
- **zerolog** - Logger estructurado
- **golang-jwt** - Tokens JWT
- **swaggo** - Documentacion Swagger

### Frontend
- **React 19** - UI Library
- **TypeScript 5** - Type Safety
- **Vite 7** - Build Tool
- **React Router 7** - Routing
- **TanStack Query 5** - Data Fetching
- **Axios** - HTTP Client
- **Tailwind CSS 4** - Styling
- **Lucide React** - Icons

## Convenciones de Codigo

### Backend - Estructura de handlers
```go
func (h *Handler) Endpoint(c *fiber.Ctx) error {
    // 1. Extraer datos (params, body, user)
    // 2. Validar
    // 3. Llamar servicio
    // 4. Manejar errores con handleXxxError()
    // 5. Retornar NewSuccessResponse() o NewErrorResponse()
}
```

### Backend - Estructura de servicios
```go
func (s *Service) Method(ctx context.Context, ...) (*Entity, error) {
    // 1. Validaciones de negocio
    // 2. Operaciones de repositorio
    // 3. Logica adicional
    // 4. Retornar entidad o domain.ErrXxx
}
```

### Frontend - Estructura de componentes
```tsx
// Componente funcional con TypeScript
interface Props {
  prop: string
}

export const Component = ({ prop }: Props) => {
  const [state, setState] = useState()
  const { data } = useQuery()

  return <div>{prop}</div>
}
```

### Frontend - Custom Hooks
```tsx
export const useCustomHook = () => {
  return useQuery({
    queryKey: ['key'],
    queryFn: () => api.getData(),
  })
}
```

### Manejo de errores

**Backend:**
- Usar errores de `internal/domain/errors.go`
- Crear `AppError` para errores con codigo HTTP
- Nunca exponer errores internos al cliente

**Frontend:**
- Usar `try/catch` con toast notifications
- Manejar errores en `onError` de mutations
- Interceptor axios para errores globales

### Logger

Backend - Usar siempre `pkg/logger`:
```go
logger.Info().Str("key", "value").Msg("mensaje")
logger.Error().Err(err).Msg("error")
```

Frontend - Usar toast context:
```tsx
const toast = useToast()
toast.success('Titulo', 'Mensaje')
toast.error('Error', 'Descripcion')
```

### Respuestas JSON
```go
// Exito
return c.JSON(NewSuccessResponse(data))

// Error
return c.Status(400).JSON(NewErrorResponse("CODE", "mensaje"))
```

## Flujos Principales

### Autenticacion SMS
```
POST /sessions {phone, api_id, api_hash}
  → Telegram envia SMS
  → Retorna session_id + phone_code_hash
  → Guardar en Redis (5 min TTL)

POST /sessions/:id/verify {code}
  → Verificar codigo con Telegram
  → Guardar session_data cifrado
  → Retornar sesion autenticada
```

### Autenticacion QR
```
POST /sessions {api_id, api_hash, auth_method: "qr"}
  → Generar QR token
  → Imprimir QR en terminal
  → Guardar en Redis (2 min TTL)
  → Retorna session_id + qr_image_base64

POST /sessions/:id/qr/wait
  → Esperar escaneo (30s timeout)
  → Si expira y attempt < 3: regenerar QR
  → Si attempt >= 3: error 429
  → Si escanea: completar auth
```

### Envio de mensajes
```
POST /sessions/:id/messages {to, text, media_type?, media_url?}
  → Cargar sesion de DB
  → Descifrar session_data
  → Crear cliente Telegram
  → Resolver peer (username/@user/+phone)
  → Enviar mensaje
  → Retornar job_id

POST /sessions/:id/messages/bulk {recipients[], text, delay_seconds}
  → Encolar mensajes
  → Enviar con delay entre cada uno
  → Retornar job_ids[]
```

## Base de Datos

### PostgreSQL
```sql
-- Usuarios API
users: id, username, email, password_hash, role, is_active

-- Sesiones Telegram
telegram_sessions: id, user_id, phone_number, api_id,
                   api_hash_encrypted, session_name, session_data,
                   auth_state, telegram_user_id, telegram_username,
                   is_active, created_at, updated_at

-- Tokens revocados
revoked_tokens: id, jti, user_id, revoked_at, expires_at
```

### Redis
```
tg:code:{session_id}  → phone_code_hash (TTL 5 min)
tg:qr:{session_id}    → storageB64|apiHash|attempt (TTL 2 min)
```

## Puntos Importantes

### Campos NULL en PostgreSQL

Los campos `telegram_user_id` y `telegram_username` pueden ser NULL. Usar COALESCE en queries:
```sql
SELECT COALESCE(telegram_user_id, 0), COALESCE(telegram_username, '')
```

### Cifrado

- `api_hash` → Se cifra con AES antes de guardar
- `session_data` → Se cifra con AES antes de guardar
- Usar `tgManager.Encrypt()` / `tgManager.Decrypt()`

### QR Regeneration

- Maximo 3 intentos por sesion
- `QRExpiredError` retorna nuevo QR + metadata
- Handler debe retornar 202 con nuevo QR

### Tipos de auth_state
```go
SessionPending          = "pending"
SessionCodeSent         = "code_sent"
SessionPasswordRequired = "password_required"
SessionAuthenticated    = "authenticated"
SessionFailed           = "failed"
```

## Frontend - Estructura

### Paginas disponibles
| Ruta | Componente | Descripcion |
|------|------------|-------------|
| `/login` | LoginPage | Inicio de sesion |
| `/register` | RegisterPage | Registro |
| `/dashboard` | DashboardPage | Panel principal |
| `/messages/:sessionId` | MessagesPage | Envio de mensajes |
| `/chats/:sessionId` | ChatsPage | Ver chats |
| `/contacts/:sessionId` | ContactsPage | Contactos |
| `/webhooks/:sessionId` | WebhooksPage | Webhooks |
| `/profile` | ProfilePage | Perfil usuario |
| `/settings` | SettingsPage | Configuracion |

### Componentes principales
- `Button` - Botones (primary, secondary, danger, ghost)
- `Input` - Inputs con label y error
- `Card` - Tarjetas con hover
- `Modal` - Modales responsive
- `Alert` - Alertas (success, error, warning, info)
- `FileUpload` - Upload de archivos con preview
- `Sidebar` - Navegacion colapsable
- `ToastContext` - Notificaciones

### Hooks disponibles
```tsx
// Sesiones
useSessions()           // Lista de sesiones
useSession(id)          // Sesion por ID
useCreateSession()      // Crear sesion
useDeleteSession()      // Eliminar sesion

// Mensajes
useSendTextMessage()    // Enviar texto
useSendPhotoMessage()   // Enviar foto
useSendVideoMessage()   // Enviar video
useSendAudioMessage()   // Enviar audio
useSendFileMessage()    // Enviar archivo
useSendBulkMessage()    // Envio masivo

// Chats
useChats(sessionId)     // Lista de chats
useChatHistory(sessionId, chatId)  // Historial
useContacts(sessionId)  // Contactos
```

## Comandos Utiles

### Backend
```bash
# Compilar y ejecutar
go build ./cmd/api && ./api

# Regenerar Swagger
swag init -g cmd/api/main.go -o docs

# Tests
go test ./...

# Ver logs en tiempo real
tail -f /var/log/telegram-api.log
```

### Frontend
```bash
# Desarrollo
cd frontend && pnpm dev

# Build produccion
pnpm build

# Preview build
pnpm preview

# Lint
pnpm lint
```

## Debugging

### Error "scan sesion"
→ Verificar que query usa COALESCE para campos nullable

### Error "CODE_EXPIRED" en QR
→ El endpoint /qr/wait debe regenerar automaticamente

### Error de cifrado
→ Verificar ENCRYPTION_KEY tiene exactamente 32 caracteres

### QR no se imprime en terminal
→ Verificar que `utils.PrintQRToTerminalWithName()` se llama en `ExportLoginToken()`

### Frontend no conecta con API
→ Verificar VITE_API_URL en .env
→ Verificar CORS en backend
→ Verificar nginx proxy_pass

## URLs de Produccion

- **Frontend**: `http://frontend.telegram-api.fututel.com/`
- **API**: `http://frontend.telegram-api.fututel.com/api/v1`
- **Swagger**: `http://frontend.telegram-api.fututel.com/docs/`
- **Uploads**: `http://frontend.telegram-api.fututel.com/uploads/`

## Estructura de Uploads

```
/uploads/
├── images/     # Imagenes (jpg, png, gif, webp) - Max 10MB
├── videos/     # Videos (mp4, webm, mov) - Max 50MB
├── audio/      # Audio (mp3, ogg, wav) - Max 20MB
└── files/      # Documentos (pdf, doc, txt) - Max 50MB
```

## TODOs / Mejoras Pendientes

### Backend
- [ ] Soporte 2FA (password required)
- [ ] Rate limit por usuario (no solo IP)
- [ ] Metricas Prometheus
- [ ] Tests de integracion
- [ ] Dockerfile optimizado
- [ ] CI/CD pipeline

### Frontend
- [x] Sistema de Toast notifications
- [x] Sidebar colapsable
- [x] Pagina de registro
- [x] Pagina de webhooks
- [x] Pagina de perfil
- [x] Pagina de configuracion
- [x] FileUpload component
- [ ] Notificaciones push
- [ ] PWA support
- [ ] Internacionalizacion (i18n)
- [ ] Tests con Vitest
