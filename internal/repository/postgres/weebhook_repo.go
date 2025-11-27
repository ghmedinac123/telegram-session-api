package postgres

import (
	"context"
	"errors"

	"telegram-api/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WebhookRepository struct {
	db *pgxpool.Pool
}

func NewWebhookRepository(db *pgxpool.Pool) *WebhookRepository {
	return &WebhookRepository{db: db}
}

func (r *WebhookRepository) Create(ctx context.Context, wh *domain.WebhookConfig) error {
	query := `
		INSERT INTO webhooks (
			id, session_id, url, secret, events, is_active, 
			max_retries, timeout_ms, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (session_id) DO UPDATE SET
			url = $3, secret = $4, events = $5, is_active = $6,
			max_retries = $7, timeout_ms = $8, updated_at = $10
	`
	_, err := r.db.Exec(ctx, query,
		wh.ID, wh.SessionID, wh.URL, wh.Secret, wh.Events,
		wh.IsActive, wh.MaxRetries, wh.TimeoutMs, wh.CreatedAt, wh.UpdatedAt,
	)
	return err
}

func (r *WebhookRepository) Update(ctx context.Context, wh *domain.WebhookConfig) error {
	query := `
		UPDATE webhooks SET 
			url = $1, secret = $2, events = $3, is_active = $4,
			max_retries = $5, timeout_ms = $6, updated_at = $7,
			last_error = $8, last_error_at = $9
		WHERE session_id = $10
	`
	_, err := r.db.Exec(ctx, query,
		wh.URL, wh.Secret, wh.Events, wh.IsActive,
		wh.MaxRetries, wh.TimeoutMs, wh.UpdatedAt,
		wh.LastError, wh.LastErrorAt, wh.SessionID,
	)
	return err
}

func (r *WebhookRepository) GetBySessionID(ctx context.Context, sessionID uuid.UUID) (*domain.WebhookConfig, error) {
	query := `
		SELECT id, session_id, url, COALESCE(secret, ''), events, is_active,
			max_retries, timeout_ms, created_at, updated_at,
			COALESCE(last_error, ''), last_error_at
		FROM webhooks WHERE session_id = $1
	`
	var wh domain.WebhookConfig
	err := r.db.QueryRow(ctx, query, sessionID).Scan(
		&wh.ID, &wh.SessionID, &wh.URL, &wh.Secret, &wh.Events,
		&wh.IsActive, &wh.MaxRetries, &wh.TimeoutMs, &wh.CreatedAt, &wh.UpdatedAt,
		&wh.LastError, &wh.LastErrorAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &wh, nil
}

func (r *WebhookRepository) Delete(ctx context.Context, sessionID uuid.UUID) error {
	query := `DELETE FROM webhooks WHERE session_id = $1`
	_, err := r.db.Exec(ctx, query, sessionID)
	return err
}

func (r *WebhookRepository) ListActive(ctx context.Context) ([]domain.WebhookConfig, error) {
	query := `
		SELECT id, session_id, url, COALESCE(secret, ''), events, is_active,
			max_retries, timeout_ms, created_at, updated_at,
			COALESCE(last_error, ''), last_error_at
		FROM webhooks WHERE is_active = true
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var webhooks []domain.WebhookConfig
	for rows.Next() {
		var wh domain.WebhookConfig
		if err := rows.Scan(
			&wh.ID, &wh.SessionID, &wh.URL, &wh.Secret, &wh.Events,
			&wh.IsActive, &wh.MaxRetries, &wh.TimeoutMs, &wh.CreatedAt, &wh.UpdatedAt,
			&wh.LastError, &wh.LastErrorAt,
		); err != nil {
			return nil, err
		}
		webhooks = append(webhooks, wh)
	}

	return webhooks, rows.Err()
}

var _ domain.WebhookRepository = (*WebhookRepository)(nil)