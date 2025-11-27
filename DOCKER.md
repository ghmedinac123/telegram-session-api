# 🐳 Docker Deployment Guide

Guía completa para desplegar el stack completo de Telegram API con Docker.

## 📦 Stack Completo

```
┌─────────────────────────────────────────┐
│         Frontend (React + Nginx)        │
│           http://localhost:3000         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Backend API (Go)               │
│           http://localhost:7789         │
└────────────┬──────────────┬─────────────┘
             │              │
┌────────────▼────┐  ┌──────▼─────────────┐
│   PostgreSQL    │  │      Redis         │
│  localhost:5649 │  │  localhost:7954    │
└─────────────────┘  └────────────────────┘
```

## 🚀 Despliegue Rápido

### 1. Configurar variables de entorno

```bash
# Exportar variables requeridas
export JWT_SECRET="tu_jwt_secret_de_minimo_32_caracteres_seguros"
export ENCRYPTION_KEY="clave_de_32_caracteres_exactos!!"
```

### 2. Desplegar stack completo

```bash
# Usando el script automatizado
./docker-deploy.sh

# O manualmente
docker-compose up -d --build
```

## 📋 Servicios

### PostgreSQL
- **Puerto:** 5649 (externo) → 5432 (interno)
- **Usuario:** admin
- **Password:** password123
- **Database:** telegram_db
- **Healthcheck:** `pg_isready`

### Redis
- **Puerto:** 7954 (externo) → 6379 (interno)
- **Persistencia:** AOF habilitada
- **Healthcheck:** `redis-cli ping`

### Backend API (Go)
- **Puerto:** 7789 (externo) → 8080 (interno)
- **Imagen:** `ghmedinac/telegram-api:latest`
- **Healthcheck:** `wget http://localhost:8080/health`
- **Depende de:** PostgreSQL, Redis

### Frontend (React)
- **Puerto:** 3000 (externo) → 80 (interno)
- **Imagen:** `ghmedinac/telegram-frontend:latest`
- **Servidor:** Nginx
- **Healthcheck:** `wget http://localhost/`
- **Depende de:** Backend API

## 🛠️ Comandos Útiles

### Ver logs
```bash
# Todos los servicios
docker-compose logs -f

# Un servicio específico
docker-compose logs -f frontend
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Verificar estado
```bash
docker-compose ps
```

### Reiniciar servicios
```bash
# Todos
docker-compose restart

# Uno específico
docker-compose restart frontend
```

### Detener servicios
```bash
# Detener sin eliminar volúmenes
docker-compose down

# Detener y eliminar volúmenes (⚠️ borra datos)
docker-compose down -v
```

### Reconstruir imágenes
```bash
# Sin caché
docker-compose build --no-cache

# Solo un servicio
docker-compose build --no-cache frontend
```

### Ejecutar comandos en contenedores
```bash
# Shell en el frontend
docker exec -it telegram_frontend sh

# Shell en el backend
docker exec -it telegram_api_app sh

# Conectar a PostgreSQL
docker exec -it tg_postgres psql -U admin -d telegram_db

# Conectar a Redis
docker exec -it tg_redis redis-cli
```

## 🔒 Variables de Entorno

### Backend API
```bash
API_PORT=8080
API_ENV=production
LOG_LEVEL=info
DB_URL=postgres://admin:password123@tg_postgres:5432/telegram_db?sslmode=disable
REDIS_ADDR=tg_redis:6379
REDIS_PASSWORD=
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=24h
ENCRYPTION_KEY=${ENCRYPTION_KEY}
```

## 📊 Monitoreo

### Verificar salud de servicios
```bash
# Ver healthchecks
docker-compose ps

# Inspeccionar un contenedor
docker inspect telegram_frontend | grep -A 10 Health
```

### Recursos utilizados
```bash
docker stats
```

## 🐛 Troubleshooting

### Frontend no carga
```bash
# Verificar logs
docker-compose logs frontend

# Verificar que el backend esté disponible
docker exec -it telegram_frontend wget -O- http://api:8080/health
```

### Backend no conecta a la DB
```bash
# Verificar PostgreSQL
docker exec -it tg_postgres pg_isready -U admin -d telegram_db

# Ver logs del backend
docker-compose logs api
```

### Redis connection refused
```bash
# Verificar Redis
docker exec -it tg_redis redis-cli ping

# Ver logs
docker-compose logs redis
```

### Reconstruir desde cero
```bash
# Detener todo y limpiar
docker-compose down -v
docker system prune -a

# Volver a construir
./docker-deploy.sh
```

## 🚀 Deploy a Producción

### 1. Subir imágenes a Docker Hub

```bash
# Login en Docker Hub
docker login

# Build y push
docker-compose build
docker-compose push
```

### 2. En el servidor de producción

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/telegram-api.git
cd telegram-api

# Configurar variables
export JWT_SECRET="..."
export ENCRYPTION_KEY="..."

# Desplegar
./docker-deploy.sh
```

## 📁 Volúmenes Persistentes

Los datos se persisten en volúmenes Docker:

- `postgres_data` - Base de datos PostgreSQL
- `redis_data` - Datos de Redis (AOF)

### Backup
```bash
# PostgreSQL
docker exec tg_postgres pg_dump -U admin telegram_db > backup.sql

# Restaurar
docker exec -i tg_postgres psql -U admin telegram_db < backup.sql
```

## 🔄 Actualizar versiones

```bash
# Pull de nuevas imágenes
docker-compose pull

# Recrear contenedores
docker-compose up -d --force-recreate

# O usar el script
./docker-deploy.sh 0.2.0
```

## 📝 Notas

- El frontend hace proxy al backend a través de Nginx (ver `frontend/nginx.conf`)
- Los healthchecks aseguran que los servicios dependan correctamente
- Las imágenes usan multi-stage builds para optimizar tamaño
- Frontend usa Node 22 Alpine + Nginx Alpine (muy ligero)
