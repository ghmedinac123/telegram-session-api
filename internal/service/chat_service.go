package service

import (
	"context"
	"fmt"

	"telegram-api/internal/config"
	"telegram-api/internal/domain"
	"telegram-api/internal/telegram"
	"telegram-api/pkg/logger"

	"github.com/google/uuid"
	"github.com/gotd/td/session"
	tgClient "github.com/gotd/td/telegram"
)

// ChatService gestiona operaciones de chats y contactos
type ChatService struct {
	sessionRepo domain.SessionRepository
	cacheRepo   domain.CacheRepository
	tgManager   *telegram.ClientManager
	cacheCfg    config.CacheConfig
}

func NewChatService(
	sessionRepo domain.SessionRepository,
	cacheRepo domain.CacheRepository,
	tgManager *telegram.ClientManager,
	cfg *config.Config,
) *ChatService {
	return &ChatService{
		sessionRepo: sessionRepo,
		cacheRepo:   cacheRepo,
		tgManager:   tgManager,
		cacheCfg:    cfg.Cache,
	}
}

// ==================== CONTACTS CON CACHE + PAGINACIÓN ====================

func (s *ChatService) GetContacts(ctx context.Context, userID, sessionID uuid.UUID, req domain.GetContactsRequest) (*domain.ContactsResponse, error) {
	sess, err := s.getValidSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	if req.Limit <= 0 || req.Limit > 200 {
		req.Limit = 50
	}

	cacheKey := fmt.Sprintf("tg:contacts:%s", sessionID.String())
	var allContacts []domain.Contact
	fromCache := false

	if !req.Refresh {
		var cached domain.ContactsResponse
		if err := s.cacheRepo.GetJSON(ctx, cacheKey, &cached); err == nil && len(cached.Contacts) > 0 {
			allContacts = cached.Contacts
			fromCache = true
			logger.Debug().Str("session_id", sessionID.String()).Int("cached_count", len(allContacts)).Msg("contactos de cache")
		}
	}

	if len(allContacts) == 0 {
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

		allContacts = result.Contacts

		if len(allContacts) > 0 {
			cacheData := domain.ContactsResponse{Contacts: allContacts, TotalCount: len(allContacts)}
			if err := s.cacheRepo.SetJSON(ctx, cacheKey, cacheData, s.cacheCfg.ContactsTTL); err != nil {
				logger.Warn().Err(err).Msg("error guardando contactos en cache")
			}
		}
	}

	total := len(allContacts)
	start := req.Offset
	if start > total {
		start = total
	}
	end := start + req.Limit
	if end > total {
		end = total
	}

	return &domain.ContactsResponse{
		Contacts:   allContacts[start:end],
		TotalCount: total,
		HasMore:    end < total,
		FromCache:  fromCache,
	}, nil
}

// ==================== CHATS/DIALOGS CON CACHE ====================

func (s *ChatService) GetDialogs(ctx context.Context, userID, sessionID uuid.UUID, req domain.GetChatsRequest) (*domain.ChatsResponse, error) {
	sess, err := s.getValidSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	if req.Limit <= 0 || req.Limit > 100 {
		req.Limit = 50
	}

	cacheKey := fmt.Sprintf("tg:chats:%s:archived_%t", sessionID.String(), req.Archived)
	var allChats []domain.Chat
	fromCache := false

	if !req.Refresh {
		var cached domain.ChatsResponse
		if err := s.cacheRepo.GetJSON(ctx, cacheKey, &cached); err == nil && len(cached.Chats) > 0 {
			allChats = cached.Chats
			fromCache = true
			logger.Debug().Str("session_id", sessionID.String()).Int("cached_count", len(allChats)).Msg("chats de cache")
		}
	}

	if len(allChats) == 0 {
		client, err := s.createClient(ctx, sess)
		if err != nil {
			return nil, fmt.Errorf("create client: %w", err)
		}

		var result *domain.ChatsResponse
		err = client.Run(ctx, func(ctx context.Context) error {
			var runErr error
			tempReq := domain.GetChatsRequest{Limit: 100, Archived: req.Archived}
			result, runErr = s.tgManager.GetDialogs(ctx, client, tempReq)
			return runErr
		})
		if err != nil {
			return nil, fmt.Errorf("get dialogs: %w", err)
		}

		allChats = result.Chats

		if len(allChats) > 0 {
			cacheData := domain.ChatsResponse{Chats: allChats, TotalCount: len(allChats)}
			if err := s.cacheRepo.SetJSON(ctx, cacheKey, cacheData, s.cacheCfg.ChatsTTL); err != nil {
				logger.Warn().Err(err).Msg("error guardando chats en cache")
			}
		}
	}

	total := len(allChats)
	start := req.Offset
	if start > total {
		start = total
	}
	end := start + req.Limit
	if end > total {
		end = total
	}

	return &domain.ChatsResponse{
		Chats:      allChats[start:end],
		TotalCount: total,
		HasMore:    end < total,
		FromCache:  fromCache,
	}, nil
}

// ==================== CHAT INFO CON CACHE ====================

func (s *ChatService) GetChatInfo(ctx context.Context, userID, sessionID uuid.UUID, chatID int64) (*domain.Chat, error) {
	sess, err := s.getValidSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	cacheKey := fmt.Sprintf("tg:chat:%s:%d", sessionID.String(), chatID)

	var cached domain.Chat
	if err := s.cacheRepo.GetJSON(ctx, cacheKey, &cached); err == nil && cached.ID != 0 {
		logger.Debug().Int64("chat_id", chatID).Msg("chat info de cache")
		return &cached, nil
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

	if result != nil {
		_ = s.cacheRepo.SetJSON(ctx, cacheKey, result, s.cacheCfg.ChatInfoTTL)
	}

	return result, nil
}

// ==================== HISTORY (SIN CACHE) ====================

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

// ==================== RESOLVE CON CACHE ====================

func (s *ChatService) ResolvePeer(ctx context.Context, userID, sessionID uuid.UUID, req domain.ResolveRequest) (*domain.ResolvedPeer, error) {
	sess, err := s.getValidSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}

	identifier := req.Username
	if identifier == "" {
		identifier = req.Phone
	}
	cacheKey := fmt.Sprintf("tg:resolve:%s:%s", sessionID.String(), identifier)

	var cached domain.ResolvedPeer
	if err := s.cacheRepo.GetJSON(ctx, cacheKey, &cached); err == nil && cached.ID != 0 {
		logger.Debug().Str("identifier", identifier).Msg("peer de cache")
		return &cached, nil
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

	if result != nil {
		_ = s.cacheRepo.SetJSON(ctx, cacheKey, result, s.cacheCfg.ResolveTTL)
	}

	return result, nil
}

// ==================== INVALIDATE CACHE ====================

func (s *ChatService) InvalidateCache(ctx context.Context, sessionID uuid.UUID, cacheType string) error {
	var keys []string

	switch cacheType {
	case "contacts":
		keys = []string{fmt.Sprintf("tg:contacts:%s", sessionID.String())}
	case "chats":
		keys = []string{
			fmt.Sprintf("tg:chats:%s:archived_true", sessionID.String()),
			fmt.Sprintf("tg:chats:%s:archived_false", sessionID.String()),
		}
	case "all":
		// Eliminar todas las claves conocidas para esta sesión
		keys = []string{
			fmt.Sprintf("tg:contacts:%s", sessionID.String()),
			fmt.Sprintf("tg:chats:%s:archived_true", sessionID.String()),
			fmt.Sprintf("tg:chats:%s:archived_false", sessionID.String()),
		}
		// También intentar scan para chat info y resolve (opcional)
		pattern := fmt.Sprintf("tg:chat:%s:*", sessionID.String())
		if scanned, err := s.cacheRepo.ScanKeys(ctx, pattern, 100); err == nil {
			keys = append(keys, scanned...)
		}
		pattern = fmt.Sprintf("tg:resolve:%s:*", sessionID.String())
		if scanned, err := s.cacheRepo.ScanKeys(ctx, pattern, 100); err == nil {
			keys = append(keys, scanned...)
		}
	default:
		return fmt.Errorf("tipo de cache no válido: %s", cacheType)
	}

	if len(keys) > 0 {
		return s.cacheRepo.Delete(ctx, keys...)
	}
	return nil
}

// ==================== HELPERS ====================

func (s *ChatService) getValidSession(ctx context.Context, userID, sessionID uuid.UUID) (*domain.TelegramSession, error) {
	sess, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}
	if sess.UserID != userID {
		return nil, domain.ErrUnauthorized
	}
	if !sess.IsActive {
		return nil, domain.ErrSessionInactive
	}
	return sess, nil
}

func (s *ChatService) createClient(ctx context.Context, sess *domain.TelegramSession) (*tgClient.Client, error) {
	apiHashBytes, err := s.tgManager.Decrypt(sess.ApiHashEncrypted)
	if err != nil {
		return nil, fmt.Errorf("decrypt api_hash: %w", err)
	}

	sessionData, err := s.tgManager.Decrypt(sess.SessionData)
	if err != nil {
		return nil, fmt.Errorf("decrypt session: %w", err)
	}

	storage := &session.StorageMemory{}
	if err := storage.StoreSession(ctx, sessionData); err != nil {
		return nil, fmt.Errorf("store session: %w", err)
	}

	return tgClient.NewClient(sess.ApiID, string(apiHashBytes), tgClient.Options{
		SessionStorage: storage,
		Device: tgClient.DeviceConfig{
			DeviceModel:    sess.SessionName,
			SystemVersion:  "1.0",
			AppVersion:     "1.0.0",
			SystemLangCode: "es",
			LangCode:       "es",
		},
	}), nil
}