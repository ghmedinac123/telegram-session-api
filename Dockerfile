# ============================================
# STAGE 1: Builder
# ============================================
FROM golang:1.25-alpine AS builder

# Dependencias mínimas para compilar
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# Cache de dependencias (solo se re-ejecuta si cambian go.mod/go.sum)
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copiar código fuente
COPY . .

# Compilar binario estático optimizado
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o /build/api \
    ./cmd/api

# ============================================
# STAGE 2: Runner (imagen mínima)
# ============================================
FROM scratch

# Certificados SSL para HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Binario compilado
COPY --from=builder /build/api /api

# Migraciones (si las necesitas dentro del contenedor)
COPY --from=builder /build/db/migrations /db/migrations

# Puerto
EXPOSE 8080

# Ejecutar
ENTRYPOINT ["/api"]