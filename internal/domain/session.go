package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type SessionStatus string

const (
	SessionPending          SessionStatus = "pending"
	SessionCodeSent         SessionStatus = "code_sent"
	SessionPasswordRequired SessionStatus = "password_required"
	SessionAuthenticated    SessionStatus = "authenticated"
	SessionFailed           SessionStatus = "failed"
)

type AuthMethod string

const (
	AuthMethodSMS AuthMethod = "sms"
	AuthMethodQR  AuthMethod = "qr"
)

type TelegramSession struct {
	ID               uuid.UUID     `json:"id"`
	UserID           uuid.UUID     `json:"user_id"`
	PhoneNumber      string        `json:"phone_number"`
	ApiID            int           `json:"api_id"`
	ApiHash          string        `json:"-"`
	ApiHashEncrypted []byte        `json:"-"`
	SessionName      string        `json:"session_name"`
	SessionData      []byte        `json:"-"`
	AuthState        SessionStatus `json:"auth_state"`
	TelegramUserID   int64         `json:"telegram_user_id,omitempty"`
	TelegramUsername string        `json:"telegram_username,omitempty"`
	IsActive         bool          `json:"is_active"`
	CreatedAt        time.Time     `json:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at"`
}

type CreateSessionRequest struct {
	Phone       string     `json:"phone,omitempty"`
	ApiID       int        `json:"api_id" validate:"required,gt=0"`
	ApiHash     string     `json:"api_hash" validate:"required,len=32"`
	SessionName string     `json:"session_name,omitempty"`
	AuthMethod  AuthMethod `json:"auth_method,omitempty"`
}

type VerifyCodeRequest struct {
	Code string `json:"code" validate:"required,min=5,max=6"`
}

type Verify2FARequest struct {
	Password string `json:"password" validate:"required"`
}

type QRCodeResponse struct {
	Token       string `json:"token"`
	URL         string `json:"url"`
	QRImageB64  string `json:"qr_image_base64"`
	ExpiresIn   int    `json:"expires_in"`
}

type SessionRepository interface {
	Create(ctx context.Context, session *TelegramSession) error
	GetByID(ctx context.Context, id uuid.UUID) (*TelegramSession, error)
	GetByPhone(ctx context.Context, phone string) (*TelegramSession, error)
	GetByUserAndPhone(ctx context.Context, userID uuid.UUID, phone string) (*TelegramSession, error)
	Update(ctx context.Context, session *TelegramSession) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]TelegramSession, error)
}