package telegram

import (
	"context"
	"fmt"
	"sync"
	"time"

	"telegram-api/internal/domain"
	"telegram-api/pkg/logger"

	"github.com/google/uuid"
	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/tg"
)

// SessionPool gestiona clientes Telegram activos
type SessionPool struct {
	sessions    map[uuid.UUID]*ActiveSession
	mu          sync.RWMutex
	manager     *ClientManager
	repo        domain.SessionRepository
	webhookRepo domain.WebhookRepository
	dispatcher  *EventDispatcher
}

// ActiveSession representa una sesión activa escuchando eventos
type ActiveSession struct {
	SessionID    uuid.UUID
	SessionName  string
	TelegramID   int64
	Client       *telegram.Client
	API          *tg.Client
	Cancel       context.CancelFunc
	StartedAt    time.Time
	IsConnected  bool
	LastActivity time.Time
	mu           sync.RWMutex
}

// NewSessionPool crea el pool de sesiones
func NewSessionPool(
	manager *ClientManager,
	repo domain.SessionRepository,
	webhookRepo domain.WebhookRepository,
) *SessionPool {
	pool := &SessionPool{
		sessions:    make(map[uuid.UUID]*ActiveSession),
		manager:     manager,
		repo:        repo,
		webhookRepo: webhookRepo,
	}
	pool.dispatcher = NewEventDispatcher(webhookRepo)
	return pool
}

// StartSession inicia una sesión y comienza a escuchar eventos
func (p *SessionPool) StartSession(ctx context.Context, sess *domain.TelegramSession) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Ya está activa?
	if _, exists := p.sessions[sess.ID]; exists {
		return nil
	}

	// Descifrar credenciales
	apiHashBytes, err := p.manager.Decrypt(sess.ApiHashEncrypted)
	if err != nil {
		return fmt.Errorf("decrypt api_hash: %w", err)
	}

	sessionData, err := p.manager.Decrypt(sess.SessionData)
	if err != nil {
		return fmt.Errorf("decrypt session: %w", err)
	}

	// Crear storage con sesión existente
	storage := &session.StorageMemory{}
	if err := storage.StoreSession(ctx, sessionData); err != nil {
		return fmt.Errorf("store session: %w", err)
	}

	// Crear cliente con dispatcher de updates
	dispatcher := tg.NewUpdateDispatcher()
	client := telegram.NewClient(sess.ApiID, string(apiHashBytes), telegram.Options{
		SessionStorage: storage,
		UpdateHandler:  dispatcher,
		Device: telegram.DeviceConfig{
			DeviceModel:    sess.SessionName,
			SystemVersion:  "1.0",
			AppVersion:     "1.0.0",
			SystemLangCode: "es",
			LangCode:       "es",
		},
	})

	// Contexto cancelable
	sessionCtx, cancel := context.WithCancel(context.Background())

	active := &ActiveSession{
		SessionID:   sess.ID,
		SessionName: sess.SessionName,
		TelegramID:  sess.TelegramUserID,
		Client:      client,
		Cancel:      cancel,
		StartedAt:   time.Now(),
		IsConnected: false,
	}

	// Registrar handlers de eventos
	p.registerHandlers(dispatcher, active)

	// Iniciar cliente en goroutine
	go p.runClient(sessionCtx, active, client)

	p.sessions[sess.ID] = active

	// Notificar inicio
	p.dispatcher.Dispatch(sess.ID, domain.EventSessionStarted, domain.SessionEventData{
		SessionID:   sess.ID,
		SessionName: sess.SessionName,
		TelegramID:  sess.TelegramUserID,
	})

	logger.Info().
		Str("session_id", sess.ID.String()).
		Str("session_name", sess.SessionName).
		Msg("🚀 Sesión iniciada en pool")

	return nil
}

// StopSession detiene una sesión
func (p *SessionPool) StopSession(sessionID uuid.UUID) {
	p.mu.Lock()
	defer p.mu.Unlock()

	if active, exists := p.sessions[sessionID]; exists {
		active.Cancel()
		delete(p.sessions, sessionID)

		p.dispatcher.Dispatch(sessionID, domain.EventSessionStopped, domain.SessionEventData{
			SessionID:   sessionID,
			SessionName: active.SessionName,
		})

		logger.Info().
			Str("session_id", sessionID.String()).
			Msg("🛑 Sesión detenida")
	}
}

// GetActiveSession obtiene una sesión activa
func (p *SessionPool) GetActiveSession(sessionID uuid.UUID) (*ActiveSession, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	active, exists := p.sessions[sessionID]
	return active, exists
}

// ActiveCount retorna cantidad de sesiones activas
func (p *SessionPool) ActiveCount() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return len(p.sessions)
}

// ListActive retorna IDs de sesiones activas
func (p *SessionPool) ListActive() []uuid.UUID {
	p.mu.RLock()
	defer p.mu.RUnlock()
	ids := make([]uuid.UUID, 0, len(p.sessions))
	for id := range p.sessions {
		ids = append(ids, id)
	}
	return ids
}

func (p *SessionPool) runClient(ctx context.Context, active *ActiveSession, client *telegram.Client) {
	err := client.Run(ctx, func(ctx context.Context) error {
		active.mu.Lock()
		active.API = client.API()
		active.IsConnected = true
		active.mu.Unlock()

		logger.Info().
			Str("session_id", active.SessionID.String()).
			Msg("✅ Cliente Telegram conectado, escuchando eventos...")

		// Mantener conexión activa
		<-ctx.Done()
		return ctx.Err()
	})

	active.mu.Lock()
	active.IsConnected = false
	active.mu.Unlock()

	if err != nil && ctx.Err() == nil {
		logger.Error().Err(err).
			Str("session_id", active.SessionID.String()).
			Msg("❌ Cliente Telegram desconectado con error")

		p.dispatcher.Dispatch(active.SessionID, domain.EventSessionError, domain.SessionEventData{
			SessionID: active.SessionID,
			Error:     err.Error(),
		})
	}
}

func (p *SessionPool) registerHandlers(dispatcher tg.UpdateDispatcher, active *ActiveSession) {
	// Nuevo mensaje
	dispatcher.OnNewMessage(func(ctx context.Context, e tg.Entities, update *tg.UpdateNewMessage) error {
		msg, ok := update.Message.(*tg.Message)
		if !ok || msg.Out { // Ignorar mensajes salientes
			return nil
		}

		active.mu.Lock()
		active.LastActivity = time.Now()
		active.mu.Unlock()

		data := p.parseMessage(e, msg)
		p.dispatcher.Dispatch(active.SessionID, domain.EventNewMessage, data)

		return nil
	})

	// Mensaje editado
	dispatcher.OnEditMessage(func(ctx context.Context, e tg.Entities, update *tg.UpdateEditMessage) error {
		msg, ok := update.Message.(*tg.Message)
		if !ok {
			return nil
		}

		data := p.parseMessage(e, msg)
		p.dispatcher.Dispatch(active.SessionID, domain.EventEditMessage, data)

		return nil
	})

	// Usuario escribiendo
	dispatcher.OnUserTyping(func(ctx context.Context, e tg.Entities, update *tg.UpdateUserTyping) error {
		data := domain.TypingEventData{
			ChatID: update.UserID,
			UserID: update.UserID,
			Action: "typing",
		}
		p.dispatcher.Dispatch(active.SessionID, domain.EventUserTyping, data)
		return nil
	})

	// Estado de usuario (online/offline)
	dispatcher.OnUserStatus(func(ctx context.Context, e tg.Entities, update *tg.UpdateUserStatus) error {
		data := domain.UserStatusEventData{
			UserID: update.UserID,
		}

		switch s := update.Status.(type) {
		case *tg.UserStatusOnline:
			data.Status = "online"
			p.dispatcher.Dispatch(active.SessionID, domain.EventUserOnline, data)
		case *tg.UserStatusOffline:
			data.Status = "offline"
			data.LastSeen = time.Unix(int64(s.WasOnline), 0)
			p.dispatcher.Dispatch(active.SessionID, domain.EventUserOffline, data)
		case *tg.UserStatusRecently:
			data.Status = "recently"
		}

		return nil
	})
}

func (p *SessionPool) parseMessage(e tg.Entities, msg *tg.Message) domain.MessageEventData {
	data := domain.MessageEventData{
		MessageID: int64(msg.ID),
		Text:      msg.Message,
		Date:      time.Unix(int64(msg.Date), 0),
	}

	// Obtener chat info
	switch peer := msg.PeerID.(type) {
	case *tg.PeerUser:
		data.ChatID = peer.UserID
		data.ChatType = "private"
		if user, ok := e.Users[peer.UserID]; ok {
			data.FromID = user.ID
			data.FromName = user.FirstName
			if user.LastName != "" {
				data.FromName += " " + user.LastName
			}
		}
	case *tg.PeerChat:
		data.ChatID = peer.ChatID
		data.ChatType = "group"
	case *tg.PeerChannel:
		data.ChatID = peer.ChannelID
		data.ChatType = "channel"
	}

	// Detectar media
	if msg.Media != nil {
		switch msg.Media.(type) {
		case *tg.MessageMediaPhoto:
			data.MediaType = "photo"
		case *tg.MessageMediaDocument:
			data.MediaType = "document"
		}
	}

	// Reply
	if msg.ReplyTo != nil {
		if reply, ok := msg.ReplyTo.(*tg.MessageReplyHeader); ok {
			data.ReplyToID = int64(reply.ReplyToMsgID)
		}
	}

	return data
}

// StartAllActive inicia todas las sesiones activas de la DB
func (p *SessionPool) StartAllActive(ctx context.Context) error {
	sessions, err := p.repo.ListByUserID(ctx, uuid.Nil) // TODO: Necesita método ListAllActive
	if err != nil {
		return err
	}

	for _, sess := range sessions {
		if sess.IsActive {
			if err := p.StartSession(ctx, &sess); err != nil {
				logger.Error().Err(err).
					Str("session_id", sess.ID.String()).
					Msg("Error iniciando sesión")
			}
		}
	}

	return nil
}