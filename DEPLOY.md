# 🚀 Guía de Despliegue - Telegram API

## 📋 Prerrequisitos

- Docker instalado
- Docker Compose (sin guión: `docker compose`)
- Cuenta en Docker Hub (opcional, para push)

## ⚡ Deploy Rápido

### 1. Configurar variables de entorno

```bash
export JWT_SECRET="tu_jwt_secret_de_minimo_32_caracteres"
export ENCRYPTION_KEY="clave_de_32_caracteres_exactos!!"
```

### 2. Ejecutar deploy

```bash
./deploy-dev.sh [version]

# Ejemplos:
./deploy-dev.sh           # Usa versión 0.1.0 por defecto
./deploy-dev.sh 0.2.0     # Especifica versión
```

## 🎯 Modos de Desarrollo

El script te preguntará qué estás desarrollando:

### 1️⃣ Backend (Go API)
- Construye solo la imagen del backend
- Despliega: PostgreSQL + Redis + Backend
- Puerto: 7789

```bash
./deploy-dev.sh
# Selecciona: 1) Backend
```

### 2️⃣ Frontend (React)
- Construye solo la imagen del frontend
- Despliega: PostgreSQL + Redis + Backend + Frontend
- Puerto: 3000

```bash
./deploy-dev.sh
# Selecciona: 2) Frontend
```

### 3️⃣ Full Stack (Ambos)
- Construye backend y frontend
- Despliega todo el stack
- Puertos: 3000 (frontend), 7789 (backend)

```bash
./deploy-dev.sh
# Selecciona: 3) Ambos
```

### 4️⃣ Solo Infraestructura
- No construye imágenes
- Despliega solo PostgreSQL + Redis
- Útil para desarrollo local sin Docker

```bash
./deploy-dev.sh
# Selecciona: 4) Solo infraestructura
```

## 🔄 Flujo de Trabajo

### Desarrollo Backend

```bash
# 1. Modificar código backend
vim cmd/api/main.go

# 2. Desplegar
./deploy-dev.sh 0.1.1
# Selecciona: 1) Backend

# 3. Ver logs
docker compose logs -f api
```

### Desarrollo Frontend

```bash
# 1. Modificar código frontend
vim frontend/src/pages/dashboard/DashboardPage.tsx

# 2. Desplegar
./deploy-dev.sh 0.1.1
# Selecciona: 2) Frontend

# 3. Ver logs
docker compose logs -f frontend
```

### Desarrollo Full Stack

```bash
# 1. Modificar backend y frontend
vim cmd/api/main.go
vim frontend/src/App.tsx

# 2. Desplegar ambos
./deploy-dev.sh 0.1.2
# Selecciona: 3) Ambos

# 3. Ver logs de todo
docker compose logs -f
```

## 🏷️ Versionado

El script usa **semantic versioning**:

```bash
# Desarrollo inicial
./deploy-dev.sh 0.1.0

# Correcciones de bugs
./deploy-dev.sh 0.1.1
./deploy-dev.sh 0.1.2

# Nuevas características
./deploy-dev.sh 0.2.0
./deploy-dev.sh 0.3.0

# Versión estable
./deploy-dev.sh 1.0.0
```

### Imágenes en Docker Hub

El script crea tags:
- `ghmedinac/telegram-api:latest`
- `ghmedinac/telegram-api:0.1.0`
- `ghmedinac/telegram-frontend:latest`
- `ghmedinac/telegram-frontend:0.1.0`

## 📦 Lo que hace el script

1. **Detecta el modo de desarrollo** (backend/frontend/fullstack/infra)
2. **Verifica variables de entorno** requeridas
3. **Detiene servicios antiguos** según el modo
4. **Construye solo las imágenes necesarias**
   - Backend: `docker compose build --no-cache api`
   - Frontend: `docker compose build --no-cache frontend`
5. **Crea tags de versión**
   - `latest` y `version` específica
6. **Pregunta si quieres hacer push** a Docker Hub
7. **Despliega solo los servicios necesarios**
8. **Muestra logs y estado**

## 🛠️ Comandos Docker Compose

### Ver servicios
```bash
docker compose ps
```

### Ver logs
```bash
# Todos
docker compose logs -f

# Solo uno
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

### Reiniciar servicios
```bash
# Todos
docker compose restart

# Solo uno
docker compose restart api
docker compose restart frontend
```

### Detener
```bash
# Detener sin borrar
docker compose stop

# Detener y eliminar contenedores
docker compose down

# Detener y eliminar TODO (⚠️ incluyendo volúmenes)
docker compose down -v
```

### Reconstruir manualmente
```bash
# Backend
docker compose build --no-cache api

# Frontend
docker compose build --no-cache frontend

# Ambos
docker compose build --no-cache
```

## 🐛 Troubleshooting

### Error: "docker-compose: command not found"
Usa `docker compose` (sin guión):
```bash
docker compose --version
```

### Frontend no se actualiza
```bash
# Reconstruir sin caché
docker compose build --no-cache frontend
docker compose up -d frontend

# Limpiar cache del navegador
Ctrl + Shift + R
```

### Backend no conecta a DB
```bash
# Verificar PostgreSQL
docker compose logs postgres

# Verificar variables de entorno
docker compose exec api env | grep DB_URL
```

### Limpiar todo y empezar de cero
```bash
# Detener y eliminar TODO
docker compose down -v

# Limpiar imágenes antiguas
docker image prune -a

# Volver a desplegar
./deploy-dev.sh
```

## 📊 Monitoreo

### Estado de contenedores
```bash
docker compose ps
```

### Recursos utilizados
```bash
docker stats
```

### Inspeccionar un contenedor
```bash
docker compose exec api sh
docker compose exec frontend sh
```

### Ver healthchecks
```bash
docker inspect telegram_api_app | grep -A 10 Health
docker inspect telegram_frontend | grep -A 10 Health
```

## 🔐 Seguridad

### Variables sensibles

**NUNCA** commitear estas variables:
```bash
JWT_SECRET
ENCRYPTION_KEY
```

Usar archivo `.env` (ya está en `.gitignore`):
```bash
# .env
JWT_SECRET=tu_secreto_super_seguro_de_32_caracteres_minimo
ENCRYPTION_KEY=clave_de_exactamente_32_caracteres!!
```

Cargar automáticamente:
```bash
source .env
./deploy-dev.sh
```

## 🚀 Deploy a Producción

### 1. Build local
```bash
./deploy-dev.sh 1.0.0
# Selecciona: 3) Ambos
# Push: y (yes)
```

### 2. En servidor de producción
```bash
# Pull de imágenes
docker pull ghmedinac/telegram-api:1.0.0
docker pull ghmedinac/telegram-frontend:1.0.0

# Configurar variables
export JWT_SECRET="..."
export ENCRYPTION_KEY="..."

# Desplegar
docker compose up -d
```

## 📝 Notas

- El script usa `docker compose` (sin guión)
- Solo reconstruye lo que estás desarrollando
- Maneja versionado automáticamente
- Pregunta antes de hacer push a Docker Hub
- Muestra logs relevantes según el modo
- Colores y formato amigable en terminal

## 🎯 Workflow Recomendado

```bash
# 1. Desarrollo local
./deploy-dev.sh 0.1.0
# Modo: según lo que estés modificando

# 2. Testing
# Probar la aplicación

# 3. Incrementar versión
./deploy-dev.sh 0.1.1

# 4. Push a Docker Hub cuando esté listo
# El script preguntará: y/N

# 5. Repetir hasta versión estable
./deploy-dev.sh 1.0.0
```

Happy coding! 🎉
