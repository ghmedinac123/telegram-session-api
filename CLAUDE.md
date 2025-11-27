# CLAUDE.md - Guía del Proyecto Telegram API

## 🎯 Propósito del Proyecto

API REST en Go para gestionar sesiones de Telegram y enviar mensajes masivos. Permite autenticación via SMS o código QR, con soporte para multimedia y envíos bulk.

## 🏗️ Estructura del Proyecto
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
│   │   ├── jwt.go               # Autenticación JWT
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
│   │       └── cache_repo.go    # Cache para códigos QR/SMS
│   ├── service/                 # Lógica de negocio
│   │   ├── auth_service.go      # Login, registro, JWT
│   │   ├── session_service.go   # Gestión sesiones Telegram
│   │   └── message_service.go   # Envío de mensajes
│   └── telegram/                # Cliente Telegram (gotd/td)
│       ├── manager.go           # Autenticación SMS/QR
│       └── sender.go            # Envío de mensajes
├── pkg/                         # Paquetes reutilizables
│   ├── crypto/aes.go            # Cifrado AES-256-GCM
│   ├── logger/logger.go         # Zerolog wrapper
│   ├── utils/qr.go              # Generación de QR
│   └── validator/validator.go   # Validación de structs
├── db/
│   ├── migrations/001_initial.sql
│   └── queries/                 # SQL de referencia
└── docs/                        # Swagger generado
```

## 🔧 Tecnologías

- **Go 1.21+** - Lenguaje
- **Fiber v2** - Framework HTTP
- **gotd/td** - Cliente Telegram MTProto
- **pgx v5** - Driver PostgreSQL
- **go-redis v9** - Cliente Redis
- **zerolog** - Logger estructurado
- **golang-jwt** - Tokens JWT
- **swaggo** - Documentación Swagger

## 📋 Convenciones de Código

### Estructura de handlers
```go
func (h *Handler) Endpoint(c *fiber.Ctx) error {
    // 1. Extraer datos (params, body, user)
    // 2. Validar
    // 3. Llamar servicio
    // 4. Manejar errores con handleXxxError()
    // 5. Retornar NewSuccessResponse() o NewErrorResponse()
}
```

### Estructura de servicios
```go
func (s *Service) Method(ctx context.Context, ...) (*Entity, error) {
    // 1. Validaciones de negocio
    // 2. Operaciones de repositorio
    // 3. Lógica adicional
    // 4. Retornar entidad o domain.ErrXxx
}
```

### Manejo de errores

- Usar errores de `internal/domain/errors.go`
- Crear `AppError` para errores con código HTTP
- Nunca exponer errores internos al cliente

### Logger

Usar siempre `pkg/logger`:
```go
logger.Info().Str("key", "value").Msg("mensaje")
logger.Error().Err(err).Msg("error")
```

### Respuestas JSON
```go
// Éxito
return c.JSON(NewSuccessResponse(data))

// Error
return c.Status(400).JSON(NewErrorResponse("CODE", "mensaje"))
```

## 🔐 Flujos Principales

### Autenticación SMS
```
POST /sessions {phone, api_id, api_hash}
  → Telegram envía SMS
  → Retorna session_id + phone_code_hash
  → Guardar en Redis (5 min TTL)

POST /sessions/:id/verify {code}
  → Verificar código con Telegram
  → Guardar session_data cifrado
  → Retornar sesión autenticada
```

### Autenticación QR
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

### Envío de mensajes
```
POST /sessions/:id/messages {to, text, media_type?, media_url?}
  → Cargar sesión de DB
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

## 🗄️ Base de Datos

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

## ⚠️ Puntos Importantes

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

- Máximo 3 intentos por sesión
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

## 🧪 Comandos Útiles
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

## 🐛 Debugging

### Error "scan sesión"
→ Verificar que query usa COALESCE para campos nullable

### Error "CODE_EXPIRED" en QR
→ El endpoint /qr/wait debe regenerar automáticamente

### Error de cifrado
→ Verificar ENCRYPTION_KEY tiene exactamente 32 caracteres

### QR no se imprime en terminal
→ Verificar que `utils.PrintQRToTerminalWithName()` se llama en `ExportLoginToken()`

## 📝 TODOs / Mejoras Pendientes

- [ ] Soporte 2FA (password required)
- [ ] Webhook para notificaciones
- [ ] Rate limit por usuario (no solo IP)
- [ ] Métricas Prometheus
- [ ] Tests de integración
- [ ] Dockerfile optimizado
- [ ] CI/CD pipeline