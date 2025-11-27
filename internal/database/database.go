package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Services struct {
	DB    *pgxpool.Pool
	Redis *redis.Client
}

func NewServices(ctx context.Context) (*Services, error) {
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DB_URL no encontrada")
	}

	dbConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("config pg: %w", err)
	}

	dbConfig.MaxConns = 25
	dbConfig.MinConns = 2
	dbConfig.MaxConnLifetime = time.Hour

	pool, err := pgxpool.NewWithConfig(ctx, dbConfig)
	if err != nil {
		return nil, fmt.Errorf("conexión pg: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping pg: %w", err)
	}
	log.Println("✅ PostgreSQL conectado")

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	if _, err := rdb.Ping(ctx).Result(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}
	log.Println("✅ Redis conectado")

	return &Services{DB: pool, Redis: rdb}, nil
}

func (s *Services) Migrate() error {
	files, err := filepath.Glob("db/migrations/*.sql")
	if err != nil {
		return fmt.Errorf("glob migraciones: %w", err)
	}

	for _, f := range files {
		schema, err := os.ReadFile(f)
		if err != nil {
			return fmt.Errorf("leer %s: %w", f, err)
		}

		if _, err := s.DB.Exec(context.Background(), string(schema)); err != nil {
			return fmt.Errorf("ejecutar %s: %w", f, err)
		}
		log.Printf("✅ Migración aplicada: %s", filepath.Base(f))
	}

	return nil
}

func (s *Services) Close() {
	s.DB.Close()
	s.Redis.Close()
}