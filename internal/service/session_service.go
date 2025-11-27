package service

import (
	"context"
	"time"

	"telegram-api/internal/config"
	"telegram-api/internal/domain"
	"telegram-api/internal/telegram"
	"telegram-api/pkg/logger"

	"github.com/google/uuid"
)

type SessionService struct {
	sessionRepo domain.SessionRepository
	userRepo    domain.UserRepository
	tgManager   *telegram.ClientManager
	cache       domain.CacheRepository
	config      *config.Config
}

func NewSessionService(
	sRepo domain.SessionRepository,
	uRepo domain.UserRepository,
	tgMgr *telegram.ClientManager,
	cache domain.CacheRepository,
	cfg *config.Config,
) *SessionService {
	return &SessionService{
		sessionRepo: sRepo,
		userRepo:    uRepo,
		tgManager:   tgMgr,
		cache:       cache,
		config:      cfg,
	}
}

const (
	maxQRAttempts = 3               // Intentos automáticos de QR
	qrTimeout     = 2 * time.Minute // Timeout por QR
)

// ==================== CREATE SESSION ====================

func (s *SessionService) CreateSession(ctx context.Context, userID uuid.UUID, req *domain.CreateSessionRequest) (*domain.TelegramSession, string, error) {
	if req.AuthMethod == domain.AuthMethodQR {
		return s.createSessionQR(ctx, userID, req)
	}
	return s.createSessionSMS(ctx, userID, req)
}

// ==================== SMS AUTH ====================

func (s *SessionService) createSessionSMS(ctx context.Context, userID uuid.UUID, req *domain.CreateSessionRequest) (*domain.TelegramSession, string, error) {
	if req.Phone == "" {
		return nil, "", domain.ErrInvalidPhoneNumber
	}

	// Verificar sesión existente
	existing, _ := s.sessionRepo.GetByUserAndPhone(ctx, userID, req.Phone)
	if existing != nil && existing.IsActive {
		return nil, "", domain.ErrSessionAlreadyExists
	}

	// Cifrar api_hash
	apiHashEncrypted, err := s.tgManager.Encrypt([]byte(req.ApiHash))
	if err != nil {
		return nil, "", domain.ErrInternal
	}

	// Enviar código SMS
	phoneCodeHash, err := s.tgManager.SendCode(ctx, req.ApiID, req.ApiHash, req.Phone)
	if err != nil {
		logger.Error().Err(err).Str("phone", req.Phone).Msg("Error enviando código SMS")
		return nil, "", domain.NewAppError(err, "Error enviando código", 502)
	}

	// Crear sesión
	session := &domain.TelegramSession{
		ID:               uuid.New(),
		UserID:           userID,
		PhoneNumber:      req.Phone,
		ApiID:            req.ApiID,
		ApiHashEncrypted: apiHashEncrypted,
		SessionName:      defaultSessionName(req.SessionName, req.Phone),
		AuthState:        domain.SessionCodeSent,
		IsActive:         false,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, "", domain.ErrDatabase
	}

	// Guardar code_hash en cache
	_ = s.cache.Set(ctx, "tg:code:"+session.ID.String(), phoneCodeHash, 300)

	logger.Info().
		Str("session_id", session.ID.String()).
		Str("phone", req.Phone).
		Msg("Sesión SMS creada, código enviado")

	return session, phoneCodeHash, nil
}

// ==================== QR AUTH ====================

func (s *SessionService) createSessionQR(ctx context.Context, userID uuid.UUID, req *domain.CreateSessionRequest) (*domain.TelegramSession, string, error) {
	// Cifrar api_hash
	apiHashEncrypted, err := s.tgManager.Encrypt([]byte(req.ApiHash))
	if err != nil {
		return nil, "", domain.ErrInternal
	}

	sessionName := defaultSessionName(req.SessionName, "QR")

	// Crear sesión en DB
	session := &domain.TelegramSession{
		ID:               uuid.New(),
		UserID:           userID,
		PhoneNumber:      "QR-pending",
		ApiID:            req.ApiID,
		ApiHashEncrypted: apiHashEncrypted,
		SessionName:      sessionName,
		AuthState:        domain.SessionPending,
		IsActive:         false,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, "", domain.ErrDatabase
	}

	// Iniciar auth QR (retorna QR + channel para resultado)
	qrImageB64, resultChan, err := s.tgManager.StartQRAuth(
		context.Background(), // Background porque el cliente debe vivir más que el request
		req.ApiID,
		req.ApiHash,
		sessionName,
		maxQRAttempts,
		qrTimeout,
	)
	if err != nil {
		logger.Error().Err(err).Msg("Error iniciando QR auth")
		_ = s.sessionRepo.Delete(ctx, session.ID)
		return nil, "", domain.NewAppError(err, "Error generando QR", 502)
	}

	// Escuchar resultado en background
	go s.handleQRResult(session.ID, resultChan)

	logger.Info().
		Str("session_id", session.ID.String()).
		Str("session_name", sessionName).
		Msg("Sesión QR iniciada, esperando escaneo en background...")

	return session, qrImageB64, nil
}

// handleQRResult procesa el resultado del QR auth en background
func (s *SessionService) handleQRResult(sessionID uuid.UUID, resultChan <-chan telegram.QRAuthResult) {
	result, ok := <-resultChan
	if !ok {
		logger.Warn().Str("session_id", sessionID.String()).Msg("Channel cerrado sin resultado")
		return
	}

	ctx := context.Background()

	// Obtener sesión actual
	session, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		logger.Error().Err(err).Str("session_id", sessionID.String()).Msg("Sesión no encontrada")
		return
	}

	// Si ya está activa, ignorar
	if session.IsActive {
		return
	}

	if result.Error != nil {
		// Falló la autenticación
		session.AuthState = domain.SessionFailed
		_ = s.sessionRepo.Update(ctx, session)
		logger.Warn().
			Err(result.Error).
			Str("session_id", sessionID.String()).
			Msg("QR auth fallido")
		return
	}

	// ¡Éxito! Actualizar sesión
	var encryptedSessionData []byte
	if len(result.SessionData) > 0 {
		encryptedSessionData, _ = s.tgManager.Encrypt(result.SessionData)
	}

	session.SessionData = encryptedSessionData
	session.AuthState = domain.SessionAuthenticated
	session.IsActive = true
	session.TelegramUserID = result.User.ID
	session.TelegramUsername = result.User.Username
	session.UpdatedAt = time.Now()

	if err := s.sessionRepo.Update(ctx, session); err != nil {
		logger.Error().Err(err).Msg("Error actualizando sesión autenticada")
		return
	}

	logger.Info().
		Str("session_id", sessionID.String()).
		Int64("telegram_user_id", result.User.ID).
		Str("telegram_username", result.User.Username).
		Msg("🎉 Sesión QR autenticada exitosamente")
}

// ==================== VERIFY SMS CODE ====================

func (s *SessionService) VerifyCode(ctx context.Context, sessionID uuid.UUID, code string) (*domain.TelegramSession, error) {
	session, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	cacheKey := "tg:code:" + sessionID.String()
	phoneCodeHash, err := s.cache.Get(ctx, cacheKey)
	if err != nil || phoneCodeHash == "" {
		return nil, domain.ErrCodeExpired
	}

	apiHashBytes, err := s.tgManager.Decrypt(session.ApiHashEncrypted)
	if err != nil {
		return nil, domain.ErrInternal
	}

	user, sessionData, err := s.tgManager.SignIn(ctx, session.ApiID, string(apiHashBytes), session.PhoneNumber, code, phoneCodeHash)
	if err != nil {
		logger.Error().Err(err).Str("session_id", sessionID.String()).Msg("Error verificando código")
		return nil, domain.ErrInvalidCode
	}

	// Completar autenticación
	return s.completeAuth(ctx, session, user, sessionData, cacheKey)
}

// ==================== HELPERS ====================

func (s *SessionService) completeAuth(ctx context.Context, session *domain.TelegramSession, user *telegram.TGUser, sessionData []byte, cacheKey string) (*domain.TelegramSession, error) {
	var encryptedSessionData []byte
	if len(sessionData) > 0 {
		encryptedSessionData, _ = s.tgManager.Encrypt(sessionData)
	}

	session.SessionData = encryptedSessionData
	session.AuthState = domain.SessionAuthenticated
	session.IsActive = true
	session.TelegramUserID = user.ID
	session.TelegramUsername = user.Username
	session.UpdatedAt = time.Now()

	if err := s.sessionRepo.Update(ctx, session); err != nil {
		return nil, domain.ErrDatabase
	}

	_ = s.cache.Delete(ctx, cacheKey)

	logger.Info().
		Str("session_id", session.ID.String()).
		Int64("tg_user_id", user.ID).
		Str("tg_username", user.Username).
		Msg("✅ Sesión autenticada")

	return session, nil
}

func defaultSessionName(name, fallback string) string {
	if name != "" {
		return name
	}
	return "Session " + fallback
}

// ==================== CRUD ====================

func (s *SessionService) ListSessions(ctx context.Context, userID uuid.UUID) ([]domain.TelegramSession, error) {
	return s.sessionRepo.ListByUserID(ctx, userID)
}

func (s *SessionService) GetSession(ctx context.Context, sessionID uuid.UUID) (*domain.TelegramSession, error) {
	return s.sessionRepo.GetByID(ctx, sessionID)
}

func (s *SessionService) DeleteSession(ctx context.Context, sessionID uuid.UUID) error {
	// Obtener sesión primero
	session, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return err
	}

	// Si tiene datos de sesión, cerrar en Telegram
	if session.IsActive && len(session.SessionData) > 0 {
		logoutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		err := s.tgManager.LogOut(
			logoutCtx,
			session.ApiID,
			session.ApiHashEncrypted,
			session.SessionData,
			session.SessionName,
		)
		if err != nil {
			logger.Warn().Err(err).Str("session_id", sessionID.String()).Msg("Error en logout de Telegram")
			// Continuar con el borrado aunque falle logout
		}
	}

	// Borrar de DB
	return s.sessionRepo.Delete(ctx, sessionID)
}