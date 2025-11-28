#!/bin/bash
#
# deploy_frontend.sh - Script de CI/CD para el frontend de Telegram API
#
# Uso: ./deploy_frontend.sh [--no-cache]
#

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Funciones de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ${GREEN}Telegram API - Frontend Deploy Script${BLUE}            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
    log_error "docker-compose.yml no encontrado. Ejecuta desde la raiz del proyecto."
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    log_error "Directorio frontend/ no encontrado."
    exit 1
fi

# Parsear argumentos
BUILD_ARGS=""
if [ "$1" == "--no-cache" ]; then
    BUILD_ARGS="--no-cache"
    log_info "Build sin cache habilitado"
fi

# Paso 1: Verificar cambios en el frontend (opcional)
log_info "Verificando estado del frontend..."
cd "$FRONTEND_DIR"

if command -v git &> /dev/null; then
    CHANGES=$(git status --porcelain . 2>/dev/null | wc -l)
    if [ "$CHANGES" -gt 0 ]; then
        log_warning "Hay $CHANGES archivos modificados en frontend/"
    fi
fi

# Paso 2: Build de la imagen Docker
log_info "Construyendo imagen Docker del frontend..."
cd "$PROJECT_DIR"

START_TIME=$(date +%s)

if ! docker compose build $BUILD_ARGS frontend; then
    log_error "Error al construir la imagen Docker"
    exit 1
fi

BUILD_TIME=$(($(date +%s) - START_TIME))
log_success "Imagen construida en ${BUILD_TIME}s"

# Paso 3: Detener contenedor actual (si existe)
log_info "Deteniendo contenedor frontend actual..."
docker compose stop frontend 2>/dev/null || true

# Paso 4: Levantar nuevo contenedor
log_info "Desplegando nuevo contenedor frontend..."
if ! docker compose up -d --no-deps frontend; then
    log_error "Error al desplegar el contenedor"
    exit 1
fi

# Paso 5: Esperar a que el contenedor esté healthy
log_info "Esperando que el contenedor esté healthy..."
TIMEOUT=60
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' telegram_frontend 2>/dev/null || echo "unknown")

    if [ "$STATUS" == "healthy" ]; then
        log_success "Contenedor healthy!"
        break
    elif [ "$STATUS" == "unhealthy" ]; then
        log_error "Contenedor unhealthy. Revisa los logs:"
        docker logs --tail 20 telegram_frontend
        exit 1
    fi

    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -ne "\r${BLUE}[INFO]${NC} Esperando... ($ELAPSED/$TIMEOUT segundos)"
done

echo "" # Nueva linea despues del contador

if [ $ELAPSED -ge $TIMEOUT ]; then
    log_warning "Timeout esperando healthcheck, verificando manualmente..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:7790/ | grep -q "200"; then
        log_success "Frontend respondiendo correctamente!"
    else
        log_error "Frontend no responde. Logs:"
        docker logs --tail 30 telegram_frontend
        exit 1
    fi
fi

# Paso 6: Limpiar imagenes dangling (opcional)
log_info "Limpiando imagenes huerfanas..."
docker image prune -f 2>/dev/null || true

# Resumen final
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Deploy completado exitosamente           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}URL:${NC} http://localhost:7790"
echo -e "  ${BLUE}Container:${NC} telegram_frontend"
echo -e "  ${BLUE}Status:${NC} $(docker inspect --format='{{.State.Health.Status}}' telegram_frontend 2>/dev/null || echo 'running')"
echo ""

# Mostrar logs recientes (opcional)
if [ "$2" == "--logs" ]; then
    log_info "Ultimos logs del frontend:"
    docker logs --tail 10 telegram_frontend
fi
