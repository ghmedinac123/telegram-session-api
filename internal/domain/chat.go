package domain

import (
	"time"
)

// ==================== CHAT/DIALOG ====================

type ChatType string

const (
	ChatTypePrivate    ChatType = "private"
	ChatTypeGroup      ChatType = "group"
	ChatTypeSupergroup ChatType = "supergroup"
	ChatTypeChannel    ChatType = "channel"
)

// Chat representa un diálogo/chat de Telegram
type Chat struct {
	ID            int64     `json:"id"`
	Type          ChatType  `json:"type"`
	Title         string    `json:"title,omitempty"`
	Username      string    `json:"username,omitempty"`
	FirstName     string    `json:"first_name,omitempty"`
	LastName      string    `json:"last_name,omitempty"`
	Photo         string    `json:"photo,omitempty"`
	UnreadCount   int       `json:"unread_count"`
	LastMessageID int       `json:"last_message_id,omitempty"`
	LastMessage   string    `json:"last_message,omitempty"`
	LastMessageAt time.Time `json:"last_message_at,omitempty"`
	IsPinned      bool      `json:"is_pinned"`
	IsMuted       bool      `json:"is_muted"`
	IsArchived    bool      `json:"is_archived"`
}

// ==================== CONTACT ====================

type Contact struct {
	ID         int64      `json:"id"`
	Phone      string     `json:"phone,omitempty"`
	FirstName  string     `json:"first_name"`
	LastName   string     `json:"last_name,omitempty"`
	Username   string     `json:"username,omitempty"`
	Photo      string     `json:"photo,omitempty"`
	IsMutual   bool       `json:"is_mutual"`
	IsBlocked  bool       `json:"is_blocked"`
	AccessHash int64      `json:"-"`
	Status     string     `json:"status,omitempty"`
	LastSeenAt *time.Time `json:"last_seen_at,omitempty"`
}

// ==================== CHAT MESSAGE ====================

type ChatMessage struct {
	ID          int       `json:"id"`
	ChatID      int64     `json:"chat_id"`
	FromID      int64     `json:"from_id,omitempty"`
	FromName    string    `json:"from_name,omitempty"`
	Text        string    `json:"text,omitempty"`
	Date        time.Time `json:"date"`
	IsOutgoing  bool      `json:"is_outgoing"`
	IsRead      bool      `json:"is_read"`
	ReplyToID   int       `json:"reply_to_id,omitempty"`
	MediaType   string    `json:"media_type,omitempty"`
	MediaURL    string    `json:"media_url,omitempty"`
	ForwardFrom string    `json:"forward_from,omitempty"`
}

// ==================== RESOLVED PEER ====================

type ResolvedPeer struct {
	ID         int64    `json:"id"`
	Type       ChatType `json:"type"`
	Username   string   `json:"username,omitempty"`
	FirstName  string   `json:"first_name,omitempty"`
	LastName   string   `json:"last_name,omitempty"`
	Title      string   `json:"title,omitempty"`
	Phone      string   `json:"phone,omitempty"`
	AccessHash int64    `json:"-"`
	IsBot      bool     `json:"is_bot"`
	IsVerified bool     `json:"is_verified"`
}

// ==================== REQUEST DTOs ====================

type GetChatsRequest struct {
	Limit    int  `query:"limit"`
	Offset   int  `query:"offset"`
	Archived bool `query:"archived"`
	Refresh  bool `query:"refresh"` // Forzar refresh de cache
}

type GetHistoryRequest struct {
	Limit      int `query:"limit"`
	OffsetID   int `query:"offset_id"`
	OffsetDate int `query:"offset_date"`
}

// GetContactsRequest para paginación de contactos
type GetContactsRequest struct {
	Limit   int  `query:"limit"`   // default 50, max 200
	Offset  int  `query:"offset"`  // para paginación
	Refresh bool `query:"refresh"` // Forzar refresh de cache
}

type ResolveRequest struct {
	Username string `json:"username,omitempty" example:"@durov"`
	Phone    string `json:"phone,omitempty" example:"+573001234567"`
}

// ==================== RESPONSE DTOs ====================

type ChatsResponse struct {
	Chats      []Chat `json:"chats"`
	TotalCount int    `json:"total_count"`
	HasMore    bool   `json:"has_more"`
	FromCache  bool   `json:"from_cache,omitempty"` // Indica si vino de cache
}

type ContactsResponse struct {
	Contacts   []Contact `json:"contacts"`
	TotalCount int       `json:"total_count"`
	HasMore    bool      `json:"has_more"`    // Para paginación
	FromCache  bool      `json:"from_cache,omitempty"`
}

type HistoryResponse struct {
	Messages   []ChatMessage `json:"messages"`
	TotalCount int           `json:"total_count"`
	HasMore    bool          `json:"has_more"`
}