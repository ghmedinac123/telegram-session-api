package main

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"time"

	_ "telegram-api/docs"
	"telegram-api/internal/config"
	"telegram-api/internal/handler"
	"telegram-api/internal/middleware"
	"telegram-api/internal/repository/postgres"
	"telegram-api/internal/repository/redis"
	"telegram-api/internal/service"
	"telegram-api/internal/telegram"
	"telegram-api/pkg/logger"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	redisLib "github.com/redis/go-redis/v9"
)

// Version se inyecta en build time con -ldflags
var Version = "0.1.1"

// @title Telegram API
// @version 0.1.0
// @description API REST para gestionar múltiples sesiones de Telegram via MTProto
// @host localhost:7789
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		panic("config error: " + err.Error())
	}

	logger.Init(cfg.Log.Level)
	logger.Info().Str("version", Version).Msg("🚀 Telegram API iniciando...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// ==================== DATABASE ====================
	pool, err := pgxpool.New(ctx, cfg.Database.URL)
	if err != nil {
		logger.Fatal().Err(err).Msg("PostgreSQL conexión fallida")
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		logger.Fatal().Err(err).Msg("PostgreSQL ping fallido")
	}
	logger.Info().Msg("✅ PostgreSQL conectado")

	if err := runMigrations(pool); err != nil {
		logger.Fatal().Err(err).Msg("Migraciones fallidas")
	}

	// ==================== REDIS ====================
	rdb := redisLib.NewClient(&redisLib.Options{
		Addr:     cfg.Redis.Addr,
		Password: cfg.Redis.Password,
	})
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Fatal().Err(err).Msg("Redis ping fallido")
	}
	logger.Info().Msg("✅ Redis conectado")

	// ==================== REPOSITORIES ====================
	userRepo := postgres.NewUserRepository(pool)
	tokenRepo := postgres.NewRefreshTokenRepository(pool)
	sessionRepo := postgres.NewSessionRepository(pool)
	webhookRepo := postgres.NewWebhookRepository(pool)
	cacheRepo := redis.NewCacheRepository(rdb)

	// ==================== TELEGRAM ====================
	tgManager, err := telegram.NewManager(cfg, sessionRepo)
	if err != nil {
		logger.Fatal().Err(err).Msg("Telegram Manager fallido")
	}

	sessionPool := telegram.NewSessionPool(tgManager, sessionRepo, webhookRepo)

	// ==================== SERVICES ====================
	authService := service.NewAuthService(userRepo, tokenRepo, cacheRepo, cfg)
	sessionService := service.NewSessionService(sessionRepo, userRepo, tgManager, cacheRepo, cfg)
	messageService := service.NewMessageService(sessionRepo, cacheRepo, tgManager)
	chatService := service.NewChatService(sessionRepo, cacheRepo, tgManager, cfg)

	// ==================== FIBER APP ====================
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
		AppName:               "Telegram API v" + Version,
	})
	app.Use(recover.New())
	app.Use(middleware.CORS())
	app.Use(middleware.RequestLogger())

	// ==================== DOCUMENTATION ====================
	// Swagger UI
	app.Get("/docs/*", swagger.HandlerDefault)

	// ReDoc (documentación alternativa)
	app.Get("/redoc", func(c *fiber.Ctx) error {
		return c.SendFile("./docs/redoc.html")
	})

	// Health & Info
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":          "ok",
			"version":         Version,
			"active_sessions": sessionPool.ActiveCount(),
		})
	})

	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"name":    "Telegram API",
			"version": Version,
			"docs": fiber.Map{
				"swagger": "/docs/",
				"redoc":   "/redoc",
				"openapi": "/docs/swagger.json",
			},
		})
	})

	// ==================== ROUTES ====================
	api := app.Group("/api/v1")

	// Auth (público)
	authHandler := handler.NewAuthHandler(authService)
	authHandler.RegisterRoutes(api)

	// Protected routes
	protected := api.Group("/", middleware.JWTMiddleware(authService))

	// Sessions
	sessionHandler := handler.NewSessionHandler(sessionService)
	sessionHandler.RegisterRoutes(protected)

	// Messages
	messageHandler := handler.NewMessageHandler(messageService)
	messageHandler.RegisterRoutes(protected)

	// Chats & Contacts
	chatHandler := handler.NewChatHandler(chatService)
	chatHandler.RegisterRoutes(protected)

	// Webhooks
	webhookHandler := handler.NewWebhookHandler(webhookRepo, sessionRepo, sessionPool)
	webhookHandler.RegisterRoutes(protected)

	printRoutes(app)

	// ==================== START SERVER ====================
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}

	logger.Info().
		Str("port", port).
		Str("version", Version).
		Str("swagger", "http://localhost:"+port+"/docs/").
		Str("redoc", "http://localhost:"+port+"/redoc").
		Msg("🚀 Servidor iniciado")

	if err := app.Listen(":" + port); err != nil {
		logger.Fatal().Err(err).Msg("Servidor fallido")
	}
}

func runMigrations(pool *pgxpool.Pool) error {
	paths := []string{"db/migrations/*.sql", "/db/migrations/*.sql", "migrations/*.sql"}

	var files []string
	for _, p := range paths {
		if found, _ := filepath.Glob(p); len(found) > 0 {
			files = found
			break
		}
	}

	if len(files) == 0 {
		logger.Warn().Msg("⚠️ No se encontraron archivos de migración")
		return nil
	}

	sort.Strings(files)

	ctx := context.Background()
	for _, f := range files {
		schema, err := os.ReadFile(f)
		if err != nil {
			logger.Error().Err(err).Str("file", f).Msg("Error leyendo migración")
			return err
		}
		if _, err := pool.Exec(ctx, string(schema)); err != nil {
			logger.Error().Err(err).Str("file", f).Msg("Error ejecutando migración")
			return err
		}
		logger.Info().Str("file", filepath.Base(f)).Msg("✅ Migración aplicada")
	}
	return nil
}

func printRoutes(app *fiber.App) {
	logger.Info().Msg("📍 Rutas registradas:")
	valid := map[string]bool{"GET": true, "POST": true, "PUT": true, "DELETE": true}
	seen := make(map[string]bool)
	for _, r := range app.GetRoutes() {
		key := r.Method + r.Path
		if valid[r.Method] && r.Path != "/" && r.Path != "/api/v1/" && !seen[key] {
			seen[key] = true
			logger.Info().Str("method", r.Method).Str("path", r.Path).Msg("")
		}
	}
}