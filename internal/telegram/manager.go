package telegram

import (
	"context"
	"encoding/base64"
	"fmt"
	"sync"
	"time"

	"telegram-api/internal/config"
	"telegram-api/internal/domain"
	"telegram-api/pkg/crypto"
	"telegram-api/pkg/logger"
	"telegram-api/pkg/utils"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/tg"
)

type ClientManager struct {
	cfg     *config.Config
	repo    domain.SessionRepository
	crypter *crypto.Crypter
	mu      sync.RWMutex
}

type TGUser struct {
	ID       int64
	Username string
}

type QRAuthResult struct {
	User        *TGUser
	SessionData []byte
	Error       error
}

func NewManager(cfg *config.Config, repo domain.SessionRepository) (*ClientManager, error) {
	crypter, err := crypto.NewCrypter(cfg.Encryption.Key)
	if err != nil {
		return nil, fmt.Errorf("crypto init: %w", err)
	}

	return &ClientManager{
		cfg:     cfg,
		repo:    repo,
		crypter: crypter,
	}, nil
}

func (m *ClientManager) newClient(apiID int, apiHash, sessionName string, storage telegram.SessionStorage) *telegram.Client {
	return telegram.NewClient(apiID, apiHash, telegram.Options{
		SessionStorage: storage,
		Device: telegram.DeviceConfig{
			DeviceModel:    sessionName,
			SystemVersion:  "1.0",
			AppVersion:     "1.0.0",
			SystemLangCode: "es",
			LangCode:       "es",
		},
	})
}

// ==================== SMS AUTH ====================

func (m *ClientManager) SendCode(ctx context.Context, apiID int, apiHash, phone string) (string, error) {
	storage := &session.StorageMemory{}
	client := m.newClient(apiID, apiHash, "SMS Auth", storage)

	var phoneCodeHash string

	err := client.Run(ctx, func(ctx context.Context) error {
		sent, err := client.API().AuthSendCode(ctx, &tg.AuthSendCodeRequest{
			PhoneNumber: phone,
			APIID:       apiID,
			APIHash:     apiHash,
			Settings:    tg.CodeSettings{},
		})
		if err != nil {
			return fmt.Errorf("send code: %w", err)
		}

		sc, ok := sent.(*tg.AuthSentCode)
		if !ok {
			return fmt.Errorf("unexpected response type")
		}

		phoneCodeHash = sc.PhoneCodeHash
		return nil
	})

	return phoneCodeHash, err
}

func (m *ClientManager) SignIn(ctx context.Context, apiID int, apiHash, phone, code, codeHash string) (*TGUser, []byte, error) {
	storage := &session.StorageMemory{}
	client := m.newClient(apiID, apiHash, "SMS Session", storage)

	var user *TGUser
	var sessionData []byte

	err := client.Run(ctx, func(ctx context.Context) error {
		auth, err := client.API().AuthSignIn(ctx, &tg.AuthSignInRequest{
			PhoneNumber:   phone,
			PhoneCodeHash: codeHash,
			PhoneCode:     code,
		})
		if err != nil {
			return err
		}

		a, ok := auth.(*tg.AuthAuthorization)
		if !ok {
			return fmt.Errorf("unexpected auth response")
		}

		u, ok := a.User.(*tg.User)
		if !ok {
			return fmt.Errorf("unexpected user type")
		}
		user = &TGUser{ID: u.ID, Username: u.Username}

		data, err := storage.Bytes(nil)
		if err == nil {
			sessionData = data
		}

		return nil
	})

	return user, sessionData, err
}

// ==================== QR AUTH ====================

func (m *ClientManager) StartQRAuth(
	ctx context.Context,
	apiID int,
	apiHash string,
	sessionName string,
	maxAttempts int,
	qrTimeout time.Duration,
) (qrImageB64 string, resultChan <-chan QRAuthResult, err error) {

	result := make(chan QRAuthResult, 1)
	firstQR := make(chan string, 1)
	errChan := make(chan error, 1)

	go func() {
		defer close(result)

		storage := &session.StorageMemory{}
		client := m.newClient(apiID, apiHash, sessionName, storage)

		runErr := client.Run(ctx, func(ctx context.Context) error {
			for attempt := 1; attempt <= maxAttempts; attempt++ {
				token, err := client.API().AuthExportLoginToken(ctx, &tg.AuthExportLoginTokenRequest{
					APIID:     apiID,
					APIHash:   apiHash,
					ExceptIDs: []int64{},
				})
				if err != nil {
					if attempt == 1 {
						errChan <- fmt.Errorf("export token: %w", err)
						return err
					}
					continue
				}

				switch t := token.(type) {
				case *tg.AuthLoginTokenSuccess:
					auth, ok := t.Authorization.(*tg.AuthAuthorization)
					if ok {
						if u, ok := auth.User.(*tg.User); ok {
							sessionData, _ := storage.Bytes(nil)
							result <- QRAuthResult{
								User:        &TGUser{ID: u.ID, Username: u.Username},
								SessionData: sessionData,
							}
							return nil
						}
					}

				case *tg.AuthLoginToken:
					tokenB64 := base64.URLEncoding.EncodeToString(t.Token)
					url := "tg://login?token=" + tokenB64

					qrImg, _ := utils.GenerateQRBase64(url)
					utils.PrintQRToTerminalWithName(url, sessionName)

					logger.Info().
						Str("session_name", sessionName).
						Int("attempt", attempt).
						Int("max", maxAttempts).
						Msg("QR generado, esperando escaneo...")

					if attempt == 1 {
						select {
						case firstQR <- qrImg:
						default:
						}
					}

					// Esperar escaneo con polling
					if user, sessionData, ok := m.waitForScan(ctx, client, apiID, apiHash, storage, qrTimeout); ok {
						result <- QRAuthResult{User: user, SessionData: sessionData}
						return nil
					}

					logger.Info().
						Str("session_name", sessionName).
						Int("attempt", attempt).
						Msg("QR expirado, generando nuevo...")
				}
			}

			result <- QRAuthResult{Error: fmt.Errorf("max QR attempts reached")}
			return nil
		})

		if runErr != nil && ctx.Err() == nil {
			result <- QRAuthResult{Error: runErr}
		}
	}()

	select {
	case qr := <-firstQR:
		return qr, result, nil
	case err := <-errChan:
		return "", nil, err
	case <-ctx.Done():
		return "", nil, ctx.Err()
	case <-time.After(15 * time.Second):
		return "", nil, fmt.Errorf("timeout generating first QR")
	}
}

func (m *ClientManager) waitForScan(
	ctx context.Context,
	client *telegram.Client,
	apiID int,
	apiHash string,
	storage *session.StorageMemory,
	timeout time.Duration,
) (*TGUser, []byte, bool) {

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return nil, nil, false
		case <-ticker.C:
			token, err := client.API().AuthExportLoginToken(ctx, &tg.AuthExportLoginTokenRequest{
				APIID:     apiID,
				APIHash:   apiHash,
				ExceptIDs: []int64{},
			})
			if err != nil {
				continue
			}

			switch t := token.(type) {
			case *tg.AuthLoginTokenSuccess:
				auth, ok := t.Authorization.(*tg.AuthAuthorization)
				if !ok {
					continue
				}
				u, ok := auth.User.(*tg.User)
				if !ok {
					continue
				}
				sessionData, _ := storage.Bytes(nil)
				logger.Info().
					Int64("user_id", u.ID).
					Str("username", u.Username).
					Msg("✅ QR escaneado exitosamente")
				return &TGUser{ID: u.ID, Username: u.Username}, sessionData, true

			case *tg.AuthLoginTokenMigrateTo:
				// ¡Usuario escaneó! Migrar al DC correcto
				logger.Info().Int("dc", t.DCID).Msg("QR escaneado, migrando a DC...")

				// PRIMERO: Migrar al DC
				if err := client.MigrateTo(ctx, t.DCID); err != nil {
					logger.Error().Err(err).Int("dc", t.DCID).Msg("Error migrando a DC")
					continue
				}

				// DESPUÉS: Importar el token
				res, err := client.API().AuthImportLoginToken(ctx, t.Token)
				if err != nil {
					logger.Error().Err(err).Msg("Error importando token")
					continue
				}

				success, ok := res.(*tg.AuthLoginTokenSuccess)
				if !ok {
					logger.Warn().Msgf("Tipo inesperado: %T", res)
					continue
				}

				auth, ok := success.Authorization.(*tg.AuthAuthorization)
				if !ok {
					continue
				}

				u, ok := auth.User.(*tg.User)
				if !ok {
					continue
				}

				sessionData, _ := storage.Bytes(nil)
				logger.Info().
					Int64("user_id", u.ID).
					Str("username", u.Username).
					Msg("✅ Migración DC exitosa, usuario autenticado")
				return &TGUser{ID: u.ID, Username: u.Username}, sessionData, true

			case *tg.AuthLoginToken:
				continue
			}
		}
	}

	return nil, nil, false
}

// ==================== LOGOUT ====================

func (m *ClientManager) LogOut(ctx context.Context, apiID int, apiHashEncrypted, sessionData []byte, sessionName string) error {
	if len(sessionData) == 0 {
		return nil
	}

	apiHashBytes, err := m.Decrypt(apiHashEncrypted)
	if err != nil {
		return fmt.Errorf("decrypt api_hash: %w", err)
	}

	decryptedSession, err := m.Decrypt(sessionData)
	if err != nil {
		return fmt.Errorf("decrypt session: %w", err)
	}

	storage := &session.StorageMemory{}
	if err := storage.StoreSession(ctx, decryptedSession); err != nil {
		return fmt.Errorf("store session: %w", err)
	}

	client := m.newClient(apiID, string(apiHashBytes), sessionName, storage)

	err = client.Run(ctx, func(ctx context.Context) error {
		_, err := client.API().AuthLogOut(ctx)
		return err
	})

	if err != nil {
		logger.Warn().Err(err).Msg("Error en logout")
	} else {
		logger.Info().Str("session_name", sessionName).Msg("Sesión cerrada en Telegram")
	}
	return nil
}

// ==================== CRYPTO ====================

func (m *ClientManager) Encrypt(data []byte) ([]byte, error) {
	return m.crypter.Encrypt(data)
}

func (m *ClientManager) Decrypt(data []byte) ([]byte, error) {
	return m.crypter.Decrypt(data)
}