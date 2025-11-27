package postgres

import (
	"context"
	"errors"
	"time"

	"telegram-api/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Queries SQL para refresh tokens
const (
	queryCreateToken = `
		INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, ip_address, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5::inet, $6, $7)`

	queryGetTokenByHash = `
		SELECT id, user_id, token_hash, device_info, ip_address, expires_at, revoked_at, created_at
		FROM refresh_tokens 
		WHERE token_hash = $1`

	queryRevokeToken = `
		UPDATE refresh_tokens SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL`

	queryRevokeAllUserTokens = `
		UPDATE refresh_tokens SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL`

	queryDeleteExpiredTokens = `
		DELETE FROM refresh_tokens WHERE expires_at < $1 OR revoked_at IS NOT NULL`

	queryGetActiveTokensByUser = `
		SELECT id, user_id, token_hash, device_info, ip_address, expires_at, revoked_at, created_at
		FROM refresh_tokens 
		WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > $2
		ORDER BY created_at DESC`

	queryCountActiveTokensByUser = `
		SELECT COUNT(*) FROM refresh_tokens 
		WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > $2`
)

// RefreshTokenRepository implementa domain.RefreshTokenRepository
// Single Responsibility: Solo maneja operaciones de refresh tokens
type RefreshTokenRepository struct {
	pool *pgxpool.Pool
}

// NewRefreshTokenRepository crea una nueva instancia del repositorio
func NewRefreshTokenRepository(pool *pgxpool.Pool) *RefreshTokenRepository {
	return &RefreshTokenRepository{pool: pool}
}

// Create crea un nuevo refresh token
func (r *RefreshTokenRepository) Create(ctx context.Context, token *domain.RefreshToken) error {
	_, err := r.pool.Exec(ctx, queryCreateToken,
		token.ID,
		token.UserID,
		token.TokenHash,
		token.DeviceInfo,
		nullableString(token.IPAddress),
		token.ExpiresAt,
		token.CreatedAt,
	)
	if err != nil {
		return wrapDBError(err, "crear refresh token")
	}
	return nil
}

// GetByTokenHash obtiene un token por su hash
func (r *RefreshTokenRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error) {
	token := &domain.RefreshToken{}
	var ipAddr *string

	err := r.pool.QueryRow(ctx, queryGetTokenByHash, tokenHash).Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&token.DeviceInfo,
		&ipAddr,
		&token.ExpiresAt,
		&token.RevokedAt,
		&token.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrInvalidToken
		}
		return nil, wrapDBError(err, "obtener token por hash")
	}

	if ipAddr != nil {
		token.IPAddress = *ipAddr
	}

	return token, nil
}

// Revoke revoca un token específico
func (r *RefreshTokenRepository) Revoke(ctx context.Context, id uuid.UUID) error {
	result, err := r.pool.Exec(ctx, queryRevokeToken, id, time.Now())
	if err != nil {
		return wrapDBError(err, "revocar token")
	}
	if result.RowsAffected() == 0 {
		return domain.ErrInvalidToken
	}
	return nil
}

// RevokeAllForUser revoca todos los tokens de un usuario
func (r *RefreshTokenRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, queryRevokeAllUserTokens, userID, time.Now())
	if err != nil {
		return wrapDBError(err, "revocar todos los tokens del usuario")
	}
	return nil
}

// DeleteExpired elimina tokens expirados o revocados
func (r *RefreshTokenRepository) DeleteExpired(ctx context.Context) (int64, error) {
	result, err := r.pool.Exec(ctx, queryDeleteExpiredTokens, time.Now())
	if err != nil {
		return 0, wrapDBError(err, "eliminar tokens expirados")
	}
	return result.RowsAffected(), nil
}

// GetActiveByUserID obtiene todos los tokens activos de un usuario
func (r *RefreshTokenRepository) GetActiveByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.RefreshToken, error) {
	rows, err := r.pool.Query(ctx, queryGetActiveTokensByUser, userID, time.Now())
	if err != nil {
		return nil, wrapDBError(err, "obtener tokens activos")
	}
	defer rows.Close()

	var tokens []*domain.RefreshToken
	for rows.Next() {
		token := &domain.RefreshToken{}
		var ipAddr *string

		err := rows.Scan(
			&token.ID,
			&token.UserID,
			&token.TokenHash,
			&token.DeviceInfo,
			&ipAddr,
			&token.ExpiresAt,
			&token.RevokedAt,
			&token.CreatedAt,
		)
		if err != nil {
			return nil, wrapDBError(err, "escanear token")
		}

		if ipAddr != nil {
			token.IPAddress = *ipAddr
		}
		tokens = append(tokens, token)
	}

	if err := rows.Err(); err != nil {
		return nil, wrapDBError(err, "iterar tokens")
	}

	return tokens, nil
}

// CountActiveByUserID cuenta tokens activos de un usuario
func (r *RefreshTokenRepository) CountActiveByUserID(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx, queryCountActiveTokensByUser, userID, time.Now()).Scan(&count)
	if err != nil {
		return 0, wrapDBError(err, "contar tokens activos")
	}
	return count, nil
}

// nullableString convierte string vacío a nil para campos nullable
func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Verificación en tiempo de compilación
var _ domain.RefreshTokenRepository = (*RefreshTokenRepository)(nil)