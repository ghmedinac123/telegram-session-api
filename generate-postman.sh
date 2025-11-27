#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}📮 Generando colección Postman...${NC}"

# Verificar que existe swagger.json
if [ ! -f "docs/swagger.json" ]; then
    echo -e "${YELLOW}⚠️ Generando swagger.json primero...${NC}"
    swag init -g cmd/api/main.go -o docs
fi

# Instalar herramienta si no existe
if ! command -v npx &> /dev/null; then
    echo "❌ npx no encontrado. Instala Node.js primero."
    exit 1
fi

# Convertir a Postman Collection v2.1
echo -e "${YELLOW}🔄 Convirtiendo OpenAPI a Postman...${NC}"
npx @apideck/portman -l docs/swagger.json -o docs/postman_collection.json \
    --postmanUid "telegram-api" \
    --envFile .env 2>/dev/null || {
    # Alternativa si portman falla
    echo -e "${YELLOW}🔄 Usando openapi-to-postmanv2...${NC}"
    npx openapi-to-postmanv2 -s docs/swagger.json -o docs/postman_collection.json -p
}

if [ -f "docs/postman_collection.json" ]; then
    echo -e "${GREEN}✅ Colección generada: docs/postman_collection.json${NC}"
    echo -e "${GREEN}📥 Importa en Postman: File → Import → Upload Files${NC}"
else
    echo -e "${YELLOW}⚠️ Alternativa: Importa directamente docs/swagger.json en Postman${NC}"
    echo -e "${YELLOW}   Postman soporta OpenAPI/Swagger nativamente${NC}"
fi