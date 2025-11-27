package service

import (
	"context"
	"fmt"

	"telegram-api/internal/domain"
	"telegram-api/internal/telegram"

	"github.com/google/uuid"
	"github.com/gotd/td/session"
	tgClient "github.com/gotd/td/telegram"
)

// ChatService gestiona operaciones de chats y contactos
type ChatService struct {
	sessionRepo domain.SessionRepository
	cacheRepo   domain.CacheRepository
	tgManager   *telegram.ClientManager
}

// NewChatService crea una nueva instancia
func NewChatService(
	sessionRepo domain.SessionRepository,
	cacheRepo domain.CacheRepository,
	tgManager *telegram.ClientManager,
) *ChatService {
	return &ChatService{
		sessionRepo: sessionRepo,
		cacheRepo:   cacheRepo,
		tgManager:   tgManager,
	}
}

// GetDialogs obtiene la lista de chats/diálogos de una sesión
func (s *ChatService) GetDialogs(ctx context.Context, userID, sessionID uuid.UUID, req domain.GetChatsRequest) (*domain.ChatsResponse, error) {
	sess, err := s.getValidSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	client, err := s.createClient(ctx, sess)
	if err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}

	var result *domain.ChatsResponse
	err = client.Run(ctx, func(ctx context.Context) error {
		var runErr error
		result, runErr = s.tgManager.GetDialogs(ctx, client, req)
		return runErr
	})

	if err != nil {
		return nil, fmt.Errorf("get dialogs: %w", err)
	}

	return result, nil
}

// GetChatInfo obtiene información detallada de un chat
func (s *ChatService) GetChatInfo(ctx context.Context, userID, sessionID uuid.UUID, chatID int64) (*domain.Chat, error) {
	sess, err := s.getValidSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	client, err := s.createClient(ctx, sess)
	if err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}

	var result *domain.Chat
	err = client.Run(ctx, func(ctx context.Context) error {
		var runErr error
		result, runErr = s.tgManager.GetChatInfo(ctx, client, chatID)
		return runErr
	})

	if err != nil {
		return nil, fmt.Errorf("get chat info: %w", err)
	}

	return result, nil
}

// GetChatHistory obtiene el historial de mensajes de un chat
func (s *ChatService) GetChatHistory(ctx context.Context, userID, sessionID uuid.UUID, chatID int64, req domain.GetHistoryRequest) (*domain.HistoryResponse, error) {
	sess, err := s.getValidSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	client, err := s.createClient(ctx, sess)
	if err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}

	var result *domain.HistoryResponse
	err = client.Run(ctx, func(ctx context.Context) error {
		var runErr error
		result, runErr = s.tgManager.GetChatHistory(ctx, client, chatID, req)
		return runErr
	})

	if err != nil {
		return nil, fmt.Errorf("get chat history: %w", err)
	}

	return result, nil
}

// GetContacts obtiene la lista de contactos
func (s *ChatService) GetContacts(ctx context.Context, userID, sessionID uuid.UUID) (*domain.ContactsResponse, error) {
	sess, err := s.getValidSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	client, err := s.createClient(ctx, sess)
	if err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}

	var result *domain.ContactsResponse
	err = client.Run(ctx, func(ctx context.Context) error {
		var runErr error
		result, runErr = s.tgManager.GetContacts(ctx, client)
		return runErr
	})

	if err != nil {
		return nil, fmt.Errorf("get contacts: %w", err)
	}

	return result, nil
}

// ResolvePeer resuelve un username o teléfono a un peer de Telegram
func (s *ChatService) ResolvePeer(ctx context.Context, userID, sessionID uuid.UUID, req domain.ResolveRequest) (*domain.ResolvedPeer, error) {
	sess, err := s.getValidSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	client, err := s.createClient(ctx, sess)
	if err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}

	var result *domain.ResolvedPeer
	err = client.Run(ctx, func(ctx context.Context) error {
		var runErr error
		result, runErr = s.tgManager.ResolveUsername(ctx, client, req)
		return runErr
	})

	if err != nil {
		return nil, fmt.Errorf("resolve peer: %w", err)
	}

	return result, nil
}

// ==================== HELPERS PRIVADOS ====================

// getValidSession obtiene y valida una sesión
func (s *ChatService) getValidSession(ctx context.Context, userID, sessionID uuid.UUID) (*domain.TelegramSession, error) {
	sess, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	// Verificar ownership
	if sess.UserID != userID {
		return nil, domain.ErrUnauthorized
	}

	// Verificar que está autenticada
	if !sess.IsActive {
		return nil, domain.ErrSessionInactive
	}

	return sess, nil
}

// createClient crea un cliente Telegram desde una sesión guardada
func (s *ChatService) createClient(ctx context.Context, sess *domain.TelegramSession) (*tgClient.Client, error) {
	// Descifrar api_hash
	apiHashBytes, err := s.tgManager.Decrypt(sess.ApiHashEncrypted)
	if err != nil {
		return nil, fmt.Errorf("decrypt api_hash: %w", err)
	}

	// Descifrar session_data
	sessionData, err := s.tgManager.Decrypt(sess.SessionData)
	if err != nil {
		return nil, fmt.Errorf("decrypt session: %w", err)
	}

	// Crear storage con sesión existente
	storage := &session.StorageMemory{}
	if err := storage.StoreSession(ctx, sessionData); err != nil {
		return nil, fmt.Errorf("store session: %w", err)
	}

	// Crear cliente
	client := tgClient.NewClient(sess.ApiID, string(apiHashBytes), tgClient.Options{
		SessionStorage: storage,
		Device: tgClient.DeviceConfig{
			DeviceModel:    sess.SessionName,
			SystemVersion:  "1.0",
			AppVersion:     "1.0.0",
			SystemLangCode: "es",
			LangCode:       "es",
		},
	})

	return client, nil
}