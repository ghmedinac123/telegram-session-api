# 🚀 Telegram API

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.1.0-blue.svg)](https://github.com/ghmedinac/telegram-api)

API REST multi-sesión para Telegram usando MTProto. Gestiona múltiples cuentas de Telegram, envía mensajes masivos y recibe eventos en tiempo real via webhooks.

## 📋 Características

- ✅ **Multi-sesión** - Gestiona múltiples cuentas de Telegram simultáneamente
- ✅ **Autenticación JWT** - Registro, login, refresh tokens
- ✅ **Auth Telegram** - Via SMS o código QR con regeneración automática
- ✅ **Mensajería** - Texto, fotos, videos, audio, documentos
- ✅ **Envío masivo** - Bulk messaging con delay configurable
- ✅ **Webhooks** - Recibe eventos en tiempo real (mensajes, estados, etc)
- ✅ **Chats & Contactos** - Lista diálogos, historial, contactos
- ✅ **Cifrado AES-256** - Datos sensibles cifrados
- ✅ **Rate limiting** - Protección contra flood
- ✅ **Documentación** - Swagger UI, ReDoc, Postman Collection

## 📚 Documentación

| URL | Descripción |
|-----|-------------|
| [http://localhost:7789/docs/](http://localhost:7789/docs/) | **Swagger UI** - Documentación interactiva |
| [http://localhost:7789/redoc](http://localhost:7789/redoc) | **ReDoc** - Documentación elegante |
| [http://localhost:7789/health](http://localhost:7789/health) | Health check + versión |

## 🏗️ Arquitectura

```
telegram-api/
├── cmd/api/main.go              # Punto de entrada
├── internal/
│   ├── config/                  # Configuración
│   ├── domain/                  # Entidades y DTOs
│   ├── handler/                 # Controladores HTTP (Fiber)
│   ├── middleware/              # JWT, CORS, Logger, RateLimit
│   ├── repository/
│   │   ├── postgres/            # Repositorios PostgreSQL
│   │   └── redis/               # Cache Redis
│   ├── service/                 # Lógica de negocio
│   └── telegram/                # Cliente MTProto (gotd/td)
├── pkg/                         # Paquetes reutilizables
├── db/migrations/               # SQL migrations
├── docs/                        # Swagger, ReDoc, Postman
└── docker-compose.yml
```

## 🚀 Instalación

### Requisitos
- Go 1.23+
- PostgreSQL 16+
- Redis 7+
- Docker (recomendado)

### Opción 1: Docker (recomendado)

```bash
# Clonar
git clone https://github.com/ghmedinac/telegram-api.git
cd telegram-api

# Configurar
cp .env.example .env
# Editar .env con tus valores

# Ejecutar todo
docker-compose up -d

# Ver logs
docker-compose logs -f api
```

### Opción 2: Local

```bash
# Iniciar solo DB y Redis
docker-compose up -d postgres redis

# Compilar y ejecutar
go build ./cmd/api && ./api
```

### Opción 3: Desde Docker Hub

```bash
docker pull ghmedinac/telegram-api:latest

docker run -d \
  --name telegram-api \
  -p 7789:8080 \
  -e DB_URL="postgres://user:pass@host:5432/db" \
  -e REDIS_ADDR="redis:6379" \
  -e JWT_SECRET="tu_secret_32_chars" \
  -e ENCRYPTION_KEY="tu_key_32_chars!!" \
  ghmedinac/telegram-api:latest
```

## ⚙️ Configuración

```env
# API
API_PORT=7789
API_ENV=production
LOG_LEVEL=info

# PostgreSQL
DB_URL=postgres://admin:password123@localhost:5432/telegram_db?sslmode=disable

# Redis
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=

# JWT (mínimo 32 caracteres)
JWT_SECRET=tu_jwt_secret_muy_largo_y_seguro!
JWT_EXPIRY=24h

# Cifrado (exactamente 32 caracteres)
ENCRYPTION_KEY=clave_32_caracteres_exactos!!
```

## 📖 Endpoints

### 🔐 Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Registrar usuario |
| POST | `/api/v1/auth/login` | Login → JWT |
| POST | `/api/v1/auth/refresh` | Renovar token |
| POST | `/api/v1/auth/logout` | Cerrar sesión |
| GET | `/api/v1/auth/me` | Usuario actual |

### 📱 Sesiones Telegram

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/sessions` | Crear sesión (SMS/QR) |
| GET | `/api/v1/sessions` | Listar sesiones |
| GET | `/api/v1/sessions/:id` | Obtener sesión |
| POST | `/api/v1/sessions/:id/verify` | Verificar código SMS |
| DELETE | `/api/v1/sessions/:id` | Eliminar sesión |

### 💬 Mensajes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/sessions/:id/messages/text` | Enviar texto |
| POST | `/api/v1/sessions/:id/messages/photo` | Enviar foto |
| POST | `/api/v1/sessions/:id/messages/video` | Enviar video |
| POST | `/api/v1/sessions/:id/messages/audio` | Enviar audio |
| POST | `/api/v1/sessions/:id/messages/file` | Enviar archivo |
| POST | `/api/v1/sessions/:id/messages/bulk` | Envío masivo |
| GET | `/api/v1/messages/:jobId/status` | Estado envío |

### 📋 Chats & Contactos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/sessions/:id/chats` | Listar chats |
| GET | `/api/v1/sessions/:id/chats/:chatId` | Info de chat |
| GET | `/api/v1/sessions/:id/chats/:chatId/history` | Historial |
| GET | `/api/v1/sessions/:id/contacts` | Listar contactos |
| POST | `/api/v1/sessions/:id/resolve` | Resolver @username |

### 🔔 Webhooks

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/sessions/:id/webhook` | Configurar webhook |
| GET | `/api/v1/sessions/:id/webhook` | Obtener config |
| DELETE | `/api/v1/sessions/:id/webhook` | Eliminar |
| POST | `/api/v1/sessions/:id/webhook/start` | Iniciar escucha |
| POST | `/api/v1/sessions/:id/webhook/stop` | Detener escucha |
| GET | `/api/v1/pool/status` | Estado del pool |

## 🔐 Flujos de Autenticación

### Flujo SMS

```bash
# 1. Crear sesión
curl -X POST http://localhost:7789/api/v1/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+573001234567",
    "api_id": 12345678,
    "api_hash": "tu_api_hash",
    "session_name": "mi_cuenta"
  }'

# 2. Verificar código SMS
curl -X POST http://localhost:7789/api/v1/sessions/{id}/verify \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code": "12345"}'
```

### Flujo QR

```bash
# 1. Crear sesión QR
curl -X POST http://localhost:7789/api/v1/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "api_id": 12345678,
    "api_hash": "tu_api_hash",
    "auth_method": "qr",
    "session_name": "mi_cuenta_qr"
  }'
# Respuesta incluye qr_image_base64

# El QR se regenera automáticamente (máx 3 intentos)
```

## 📤 Envío de Mensajes

```bash
# Texto simple
curl -X POST http://localhost:7789/api/v1/sessions/{id}/messages/text \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"to": "@username", "text": "Hola!"}'

# Con foto
curl -X POST http://localhost:7789/api/v1/sessions/{id}/messages/photo \
  -d '{"to": "@username", "photo_url": "https://...", "caption": "Mira!"}'

# Masivo
curl -X POST http://localhost:7789/api/v1/sessions/{id}/messages/bulk \
  -d '{
    "recipients": ["@user1", "@user2", "+57300..."],
    "text": "Mensaje para todos",
    "delay_ms": 3000
  }'
```

## 🔔 Configurar Webhook

```bash
# Configurar URL
curl -X POST http://localhost:7789/api/v1/sessions/{id}/webhook \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "url": "https://tu-servidor.com/webhook",
    "secret": "mi_secret",
    "events": ["message.new", "user.online"]
  }'

# Iniciar escucha
curl -X POST http://localhost:7789/api/v1/sessions/{id}/webhook/start
```

### Eventos disponibles:
- `message.new` - Nuevo mensaje
- `message.edit` - Mensaje editado
- `message.delete` - Mensaje eliminado
- `user.online` - Usuario conectado
- `user.offline` - Usuario desconectado
- `user.typing` - Usuario escribiendo
- `session.started` - Sesión iniciada
- `session.stopped` - Sesión detenida
- `session.error` - Error en sesión

## 🐳 Deploy

```bash
# Desplegar nueva versión
./deploy.sh 0.1.0

# El script:
# 1. Detiene contenedor actual
# 2. Reconstruye imagen
# 3. Sube a Docker Hub
# 4. Inicia nuevo contenedor
# 5. Verifica health
```

## 📝 Obtener API ID de Telegram

1. Ir a https://my.telegram.org
2. Iniciar sesión con tu número
3. Ir a "API development tools"
4. Crear nueva aplicación
5. Copiar `api_id` y `api_hash`

## 🛠️ Desarrollo

```bash
# Regenerar Swagger
swag init -g cmd/api/main.go -o docs

# Generar colección Postman
./generate-postman.sh

# Tests
go test ./...

# Build
go build ./cmd/api
```

## 📚 Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| [Go 1.23](https://golang.org) | Lenguaje |
| [Fiber v2](https://gofiber.io) | Framework HTTP |
| [gotd/td](https://github.com/gotd/td) | Cliente Telegram MTProto |
| [pgx v5](https://github.com/jackc/pgx) | Driver PostgreSQL |
| [go-redis v9](https://github.com/redis/go-redis) | Cliente Redis |
| [zerolog](https://github.com/rs/zerolog) | Logger estructurado |
| [swaggo](https://github.com/swaggo/swag) | Documentación OpenAPI |

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE)

## 👤 Autor

**ghmedinac** - [GitHub](https://github.com/ghmedinac)

---

⭐ Si te resulta útil, dale una estrella al repo!