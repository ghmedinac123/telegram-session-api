package redis

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"telegram-api/internal/domain"

	"github.com/redis/go-redis/v9"
)

// Prefijos de claves para organización
const (
	PrefixSession     = "session:"      // Sesiones de usuario (JWT blacklist)
	PrefixRateLimit   = "rate:"         // Rate limiting
	PrefixTelegram    = "tg:session:"   // Datos temporales de sesión Telegram
	PrefixVerifyCode  = "verify:"       // Códigos de verificación temporales
	PrefixCache       = "cache:"        // Caché general
)

// CacheRepository implementa domain.CacheRepository usando Redis
// Single Responsibility: Solo maneja operaciones de caché
type CacheRepository struct {
	client *redis.Client
}

// NewCacheRepository crea una nueva instancia del repositorio de caché
func NewCacheRepository(client *redis.Client) *CacheRepository {
	return &CacheRepository{client: client}
}

// Set guarda un valor string con TTL
func (r *CacheRepository) Set(ctx context.Context, key string, value interface{}, ttlSeconds int) error {
	var strValue string
	switch v := value.(type) {
	case string:
		strValue = v
	case []byte:
		strValue = string(v)
	default:
		return fmt.Errorf("tipo no soportado para Set: use SetJSON para objetos")
	}

	ttl := time.Duration(ttlSeconds) * time.Second
	err := r.client.Set(ctx, key, strValue, ttl).Err()
	if err != nil {
		return wrapRedisError(err, "set")
	}
	return nil
}

// Get obtiene un valor string
func (r *CacheRepository) Get(ctx context.Context, key string) (string, error) {
	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return "", nil // Key no existe, retornar vacío
		}
		return "", wrapRedisError(err, "get")
	}
	return val, nil
}

// Delete elimina una o más claves
func (r *CacheRepository) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	err := r.client.Del(ctx, keys...).Err()
	if err != nil {
		return wrapRedisError(err, "delete")
	}
	return nil
}

// Exists verifica si una clave existe
func (r *CacheRepository) Exists(ctx context.Context, key string) (bool, error) {
	count, err := r.client.Exists(ctx, key).Result()
	if err != nil {
		return false, wrapRedisError(err, "exists")
	}
	return count > 0, nil
}

// SetJSON guarda un objeto como JSON con TTL
func (r *CacheRepository) SetJSON(ctx context.Context, key string, value interface{}, ttlSeconds int) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("error serializando JSON: %w", err)
	}

	ttl := time.Duration(ttlSeconds) * time.Second
	err = r.client.Set(ctx, key, data, ttl).Err()
	if err != nil {
		return wrapRedisError(err, "setJSON")
	}
	return nil
}

// GetJSON obtiene un objeto JSON y lo deserializa
func (r *CacheRepository) GetJSON(ctx context.Context, key string, dest interface{}) error {
	val, err := r.client.Get(ctx, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return domain.ErrCache // Key no existe
		}
		return wrapRedisError(err, "getJSON")
	}

	if err := json.Unmarshal(val, dest); err != nil {
		return fmt.Errorf("error deserializando JSON: %w", err)
	}
	return nil
}

// IncrementRateLimit incrementa un contador para rate limiting
// Retorna el nuevo valor del contador
func (r *CacheRepository) IncrementRateLimit(ctx context.Context, key string, windowSeconds int) (int64, error) {
	pipe := r.client.Pipeline()

	// Incrementar contador
	incr := pipe.Incr(ctx, key)

	// Establecer TTL solo si es la primera vez (key nueva)
	pipe.Expire(ctx, key, time.Duration(windowSeconds)*time.Second)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, wrapRedisError(err, "incrementRateLimit")
	}

	return incr.Val(), nil
}

// GetRateLimitCount obtiene el contador actual de rate limiting
func (r *CacheRepository) GetRateLimitCount(ctx context.Context, key string) (int64, error) {
	val, err := r.client.Get(ctx, key).Int64()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return 0, nil
		}
		return 0, wrapRedisError(err, "getRateLimitCount")
	}
	return val, nil
}

// SetWithNX guarda solo si la clave no existe (útil para locks)
func (r *CacheRepository) SetWithNX(ctx context.Context, key string, value interface{}, ttlSeconds int) (bool, error) {
	ttl := time.Duration(ttlSeconds) * time.Second
	ok, err := r.client.SetNX(ctx, key, value, ttl).Result()
	if err != nil {
		return false, wrapRedisError(err, "setNX")
	}
	return ok, nil
}

// GetTTL obtiene el tiempo restante de vida de una clave
func (r *CacheRepository) GetTTL(ctx context.Context, key string) (time.Duration, error) {
	ttl, err := r.client.TTL(ctx, key).Result()
	if err != nil {
		return 0, wrapRedisError(err, "getTTL")
	}
	return ttl, nil
}

// ScanKeys busca claves por patrón (usar con cuidado en producción)
func (r *CacheRepository) ScanKeys(ctx context.Context, pattern string, count int64) ([]string, error) {
	var keys []string
	var cursor uint64

	for {
		var batch []string
		var err error
		batch, cursor, err = r.client.Scan(ctx, cursor, pattern, count).Result()
		if err != nil {
			return nil, wrapRedisError(err, "scan")
		}
		keys = append(keys, batch...)
		if cursor == 0 {
			break
		}
	}
	return keys, nil
}

// BlacklistToken añade un token a la blacklist (para logout)
func (r *CacheRepository) BlacklistToken(ctx context.Context, tokenID string, ttlSeconds int) error {
	key := PrefixSession + "blacklist:" + tokenID
	return r.Set(ctx, key, "1", ttlSeconds)
}

// IsTokenBlacklisted verifica si un token está en la blacklist
func (r *CacheRepository) IsTokenBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	key := PrefixSession + "blacklist:" + tokenID
	return r.Exists(ctx, key)
}

// StoreTelegramCode almacena temporalmente un código de verificación
func (r *CacheRepository) StoreTelegramCode(ctx context.Context, sessionID string, codeHash string, ttlSeconds int) error {
	key := PrefixVerifyCode + sessionID
	return r.Set(ctx, key, codeHash, ttlSeconds)
}

// GetTelegramCode obtiene el hash del código de verificación
func (r *CacheRepository) GetTelegramCode(ctx context.Context, sessionID string) (string, error) {
	key := PrefixVerifyCode + sessionID
	return r.Get(ctx, key)
}

// Health verifica la conectividad con Redis
func (r *CacheRepository) Health(ctx context.Context) error {
	_, err := r.client.Ping(ctx).Result()
	if err != nil {
		return wrapRedisError(err, "health check")
	}
	return nil
}

// wrapRedisError envuelve errores de Redis
func wrapRedisError(err error, operation string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%s: %w (redis: %v)", operation, domain.ErrCache, err)
}

// Verificación en tiempo de compilación
var _ domain.CacheRepository = (*CacheRepository)(nil)