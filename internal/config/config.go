package config

import (
	"os"
	"strconv"
)

type Config struct {
	Database   DatabaseConfig
	Redis      RedisConfig
	JWT        JWTConfig
	Encryption EncryptionConfig
	Log        LogConfig
}

type DatabaseConfig struct {
	URL string
}

type RedisConfig struct {
	Addr     string
	Password string
}

type JWTConfig struct {
	Secret      string
	ExpiryHours int
}

type EncryptionConfig struct {
	Key string
}

type LogConfig struct {
	Level string
}

func Load() (*Config, error) {
	expiry, _ := strconv.Atoi(os.Getenv("JWT_EXPIRY_HOURS"))
	if expiry == 0 {
		expiry = 24
	}

	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}

	return &Config{
		Database: DatabaseConfig{
			URL: os.Getenv("DB_URL"),
		},
		Redis: RedisConfig{
			Addr:     os.Getenv("REDIS_ADDR"),
			Password: os.Getenv("REDIS_PASSWORD"),
		},
		JWT: JWTConfig{
			Secret:      os.Getenv("JWT_SECRET"),
			ExpiryHours: expiry,
		},
		Encryption: EncryptionConfig{
			Key: os.Getenv("ENCRYPTION_KEY"),
		},
		Log: LogConfig{
			Level: logLevel,
		},
	}, nil
}