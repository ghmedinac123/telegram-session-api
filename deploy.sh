#!/bin/bash
set -e

# ==================== CONFIG ====================
IMAGE_NAME="ghmedinac/telegram-api"
VERSION="${1:-0.1.0}"
VERSION_TAG="${IMAGE_NAME}:${VERSION}"
LATEST_TAG="${IMAGE_NAME}:latest"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Deploying Telegram API v${VERSION}${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"

# ==================== STOP API ====================
echo -e "${YELLOW}⏹️  Deteniendo API...${NC}"
docker compose stop api 2>/dev/null || true
docker compose rm -f api 2>/dev/null || true

# ==================== REMOVE OLD IMAGES ====================
echo -e "${YELLOW}🗑️  Eliminando imágenes antiguas...${NC}"
docker rmi ${LATEST_TAG} 2>/dev/null || true
docker rmi ${VERSION_TAG} 2>/dev/null || true

# ==================== BUILD ====================
echo -e "${YELLOW}🔨 Construyendo imagen v${VERSION}...${NC}"
docker build \
    --build-arg VERSION=${VERSION} \
    -t ${VERSION_TAG} \
    -t ${LATEST_TAG} \
    .

# ==================== PUSH ====================
echo -e "${YELLOW}📤 Subiendo a Docker Hub...${NC}"
docker push ${VERSION_TAG}
docker push ${LATEST_TAG}

# ==================== START ====================
echo -e "${YELLOW}▶️  Iniciando API...${NC}"
docker compose up -d api

# ==================== CLEANUP ====================
echo -e "${YELLOW}🧹 Limpiando...${NC}"
docker image prune -f

# ==================== VERIFY ====================
echo -e "${YELLOW}✅ Verificando...${NC}"
sleep 3

if docker compose ps api 2>/dev/null | grep -q "Up\|running"; then
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Telegram API v${VERSION} DEPLOYED${NC}"
    echo -e "${GREEN}══════════════════════════════════════════${NC}"
    echo -e "${GREEN}📍 API:     http://localhost:7789${NC}"
    echo -e "${GREEN}📚 Swagger: http://localhost:7789/docs/${NC}"
    echo -e "${GREEN}🐳 Hub:     docker.io/${IMAGE_NAME}:${VERSION}${NC}"
    echo ""
    docker compose logs --tail 15 api
else
    echo -e "${RED}❌ Error: API no está corriendo${NC}"
    docker compose logs api
    exit 1
fi