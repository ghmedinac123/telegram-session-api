package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ==================== WEBHOOK CONFIG ====================

type WebhookConfig struct {
	ID           uuid.UUID  `json:"id"`
	SessionID    uuid.UUID  `json:"session_id"`
	URL          string     `json:"url"`
	Secret       string     `json:"secret,omitempty"`       // Para firmar requests
	Events       []string   `json:"events"`                 // Tipos de eventos a enviar
	IsActive     bool       `json:"is_active"`
	MaxRetries   int        `json:"max_retries"`
	TimeoutMs    int        `json:"timeout_ms"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	LastErrorAt  *time.Time `json:"last_error_at,omitempty"`
	LastError    string     `json:"last_error,omitempty"`
}

// ==================== EVENT TYPES ====================

type EventType string

const (
	EventNewMessage      EventType = "message.new"
	EventEditMessage     EventType = "message.edit"
	EventDeleteMessage   EventType = "message.delete"
	EventUserOnline      EventType = "user.online"
	EventUserOffline     EventType = "user.offline"
	EventUserTyping      EventType = "user.typing"
	EventChatAction      EventType = "chat.action"
	EventSessionStarted  EventType = "session.started"
	EventSessionStopped  EventType = "session.stopped"
	EventSessionError    EventType = "session.error"
)

// AllEvents lista todos los eventos disponibles
var AllEvents = []EventType{
	EventNewMessage,
	EventEditMessage,
	EventDeleteMessage,
	EventUserOnline,
	EventUserOffline,
	EventUserTyping,
	EventChatAction,
	EventSessionStarted,
	EventSessionStopped,
	EventSessionError,
}

// ==================== WEBHOOK EVENT (payload enviado) ====================

type WebhookEvent struct {
	ID        string      `json:"id"`
	SessionID uuid.UUID   `json:"session_id"`
	Type      EventType   `json:"type"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// ==================== EVENT DATA STRUCTS ====================

type MessageEventData struct {
	MessageID   int64     `json:"message_id"`
	ChatID      int64     `json:"chat_id"`
	ChatType    string    `json:"chat_type"`    // private, group, channel
	FromID      int64     `json:"from_id"`
	FromName    string    `json:"from_name"`
	Text        string    `json:"text,omitempty"`
	MediaType   string    `json:"media_type,omitempty"` // photo, video, audio, document
	ReplyToID   int64     `json:"reply_to_id,omitempty"`
	Date        time.Time `json:"date"`
}

type UserStatusEventData struct {
	UserID   int64     `json:"user_id"`
	Username string    `json:"username,omitempty"`
	Status   string    `json:"status"` // online, offline, recently, etc.
	LastSeen time.Time `json:"last_seen,omitempty"`
}

type TypingEventData struct {
	ChatID   int64  `json:"chat_id"`
	UserID   int64  `json:"user_id"`
	Username string `json:"username,omitempty"`
	Action   string `json:"action"` // typing, upload_photo, etc.
}

type SessionEventData struct {
	SessionID   uuid.UUID `json:"session_id"`
	SessionName string    `json:"session_name"`
	TelegramID  int64     `json:"telegram_id,omitempty"`
	Username    string    `json:"username,omitempty"`
	Error       string    `json:"error,omitempty"`
}

// ==================== REQUEST DTOs ====================

// WebhookCreateRequest para crear/actualizar webhook
type WebhookCreateRequest struct {
	URL        string   `json:"url" validate:"required,url" example:"https://mi-servidor.com/webhook"`
	Secret     string   `json:"secret,omitempty" example:"mi_secret_123"`
	Events     []string `json:"events,omitempty" example:"message.new,message.edit"`
	MaxRetries int      `json:"max_retries,omitempty" example:"3"`
	TimeoutMs  int      `json:"timeout_ms,omitempty" example:"5000"`
}

// WebhookResponse respuesta de webhook
type WebhookResponse struct {
	ID        uuid.UUID `json:"id"`
	SessionID uuid.UUID `json:"session_id"`
	URL       string    `json:"url"`
	Events    []string  `json:"events"`
	IsActive  bool      `json:"is_active"`
}

// ==================== REPOSITORY INTERFACE ====================

type WebhookRepository interface {
	Create(ctx context.Context, wh *WebhookConfig) error
	Update(ctx context.Context, wh *WebhookConfig) error
	GetBySessionID(ctx context.Context, sessionID uuid.UUID) (*WebhookConfig, error)
	Delete(ctx context.Context, sessionID uuid.UUID) error
	ListActive(ctx context.Context) ([]WebhookConfig, error)
}