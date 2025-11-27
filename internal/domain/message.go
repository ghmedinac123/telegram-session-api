package domain

import (
	"time"

	"github.com/google/uuid"
)

// ==================== MESSAGE TYPES ====================

type MessageType string

const (
	MessageTypeText  MessageType = "text"
	MessageTypePhoto MessageType = "photo"
	MessageTypeVideo MessageType = "video"
	MessageTypeAudio MessageType = "audio"
	MessageTypeFile  MessageType = "file"
)

type MessageStatus string

const (
	MessageStatusPending   MessageStatus = "pending"
	MessageStatusScheduled MessageStatus = "scheduled"
	MessageStatusSending   MessageStatus = "sending"
	MessageStatusSent      MessageStatus = "sent"
	MessageStatusFailed    MessageStatus = "failed"
)

// ==================== REQUEST DTOs ====================

// TextMessageRequest para enviar mensaje de texto
// @Description Mensaje de texto simple
type TextMessageRequest struct {
	To   string `json:"to" validate:"required" example:"@username o +573001234567"`
	Text string `json:"text" validate:"required" example:"Hola desde la API!"`
}

// PhotoMessageRequest para enviar foto
// @Description Mensaje con foto
type PhotoMessageRequest struct {
	To       string `json:"to" validate:"required" example:"@username"`
	PhotoURL string `json:"photo_url" validate:"required,url" example:"https://example.com/image.jpg"`
	Caption  string `json:"caption,omitempty" example:"Mira esta imagen"`
}

// VideoMessageRequest para enviar video
// @Description Mensaje con video
type VideoMessageRequest struct {
	To       string `json:"to" validate:"required" example:"@username"`
	VideoURL string `json:"video_url" validate:"required,url" example:"https://example.com/video.mp4"`
	Caption  string `json:"caption,omitempty" example:"Video interesante"`
}

// AudioMessageRequest para enviar audio
// @Description Mensaje con audio
type AudioMessageRequest struct {
	To       string `json:"to" validate:"required" example:"@username"`
	AudioURL string `json:"audio_url" validate:"required,url" example:"https://example.com/audio.mp3"`
	Caption  string `json:"caption,omitempty" example:"Escucha esto"`
}

// FileMessageRequest para enviar documento
// @Description Mensaje con archivo/documento
type FileMessageRequest struct {
	To      string `json:"to" validate:"required" example:"@username"`
	FileURL string `json:"file_url" validate:"required,url" example:"https://example.com/doc.pdf"`
	Caption string `json:"caption,omitempty" example:"Documento adjunto"`
}

// BulkTextRequest para envío masivo
// @Description Envío masivo de texto a múltiples destinatarios
type BulkTextRequest struct {
	Recipients []string `json:"recipients" validate:"required,min=1" example:"@user1,@user2,+573001234567"`
	Text       string   `json:"text" validate:"required" example:"Mensaje para todos"`
	DelayMs    int      `json:"delay_ms,omitempty" example:"3000"`
}

// ==================== INTERNAL REQUEST (para el servicio) ====================

type SendMessageRequest struct {
	To       string      `json:"to"`
	Text     string      `json:"text,omitempty"`
	Type     MessageType `json:"type,omitempty"`
	MediaURL string      `json:"media_url,omitempty"`
	Caption  string      `json:"caption,omitempty"`
	DelayMs  int         `json:"delay_ms,omitempty"`
}

type BulkMessageRequest struct {
	Recipients []string    `json:"recipients"`
	Text       string      `json:"text"`
	Type       MessageType `json:"type,omitempty"`
	MediaURL   string      `json:"media_url,omitempty"`
	Caption    string      `json:"caption,omitempty"`
	DelayMs    int         `json:"delay_ms,omitempty"`
}

// ==================== RESPONSE DTOs ====================

// MessageResponse respuesta al enviar mensaje
// @Description Respuesta de envío de mensaje
type MessageResponse struct {
	JobID   string        `json:"job_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Status  MessageStatus `json:"status" example:"pending"`
	SendAt  time.Time     `json:"send_at,omitempty"`
	Message string        `json:"message,omitempty" example:"Mensaje en cola"`
}

// MessageJob estado completo del job
// @Description Estado detallado del mensaje
type MessageJob struct {
	ID        string        `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	SessionID uuid.UUID     `json:"session_id"`
	To        string        `json:"to" example:"@username"`
	Text      string        `json:"text,omitempty"`
	Type      MessageType   `json:"type" example:"text"`
	MediaURL  string        `json:"media_url,omitempty"`
	Caption   string        `json:"caption,omitempty"`
	Status    MessageStatus `json:"status" example:"sent"`
	Error     string        `json:"error,omitempty"`
	SendAt    time.Time     `json:"send_at"`
	SentAt    *time.Time    `json:"sent_at,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
}

// Nota: Los errores están en errors.go (ErrSessionNotActive, etc.)