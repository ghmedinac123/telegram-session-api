package service

import (
	"context"
	"time"

	"telegram-api/internal/config"
	"telegram-api/internal/domain"
	"telegram-api/pkg/crypto"
	"telegram-api/pkg/logger"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AuthService struct {
	userRepo  domain.UserRepository
	tokenRepo domain.RefreshTokenRepository
	cacheRepo domain.CacheRepository
	config    *config.Config
}

func NewAuthService(
	userRepo domain.UserRepository,
	tokenRepo domain.RefreshTokenRepository,
	cacheRepo domain.CacheRepository,
	cfg *config.Config,
) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
		cacheRepo: cacheRepo,
		config:    cfg,
	}
}

type JWTClaims struct {
	UserID   string      `json:"uid"`
	Username string      `json:"username"`
	Role     domain.Role `json:"role"`
	jwt.RegisteredClaims
}

func (s *AuthService) Register(ctx context.Context, req *domain.CreateUserRequest) (*domain.User, error) {
	logger.Debug().Str("username", req.Username).Str("email", req.Email).Msg("Iniciando registro")

	// Verificar si username existe
	exists, err := s.userRepo.ExistsByUsername(ctx, req.Username)
	if err != nil {
		logger.Error().Err(err).Str("username", req.Username).Msg("Error verificando username")
		return nil, domain.ErrDatabase
	}
	if exists {
		logger.Warn().Str("username", req.Username).Msg("Username ya existe")
		return nil, domain.ErrUserAlreadyExists
	}

	// Verificar si email existe
	exists, err = s.userRepo.ExistsByEmail(ctx, req.Email)
	if err != nil {
		logger.Error().Err(err).Str("email", req.Email).Msg("Error verificando email")
		return nil, domain.ErrDatabase
	}
	if exists {
		logger.Warn().Str("email", req.Email).Msg("Email ya existe")
		return nil, domain.ErrEmailAlreadyExists
	}

	// Hash de la contraseña
	passwordHash, err := crypto.HashPassword(req.Password)
	if err != nil {
		logger.Error().Err(err).Msg("Error hasheando contraseña")
		return nil, domain.ErrInternal
	}

	// Crear usuario
	user := &domain.User{
		ID:           uuid.New(),
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: passwordHash,
		IsActive:     true,
		Role:         domain.RoleUser,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		logger.Error().Err(err).Str("username", req.Username).Msg("Error creando usuario en DB")
		return nil, domain.ErrDatabase
	}

	logger.Info().Str("id", user.ID.String()).Str("username", user.Username).Msg("Usuario registrado")
	return user, nil
}

func (s *AuthService) Login(ctx context.Context, req *domain.LoginRequest, ipAddr, userAgent string) (*domain.LoginResponse, error) {
	logger.Debug().Str("username", req.Username).Str("ip", ipAddr).Msg("Intento de login")

	user, err := s.userRepo.GetByUsername(ctx, req.Username)
	if err != nil {
		logger.Warn().Err(err).Str("username", req.Username).Msg("Usuario no encontrado")
		return nil, domain.ErrInvalidCredentials
	}

	if !user.IsActive {
		logger.Warn().Str("username", req.Username).Msg("Usuario inactivo")
		return nil, domain.ErrUserInactive
	}

	if !crypto.CheckPassword(req.Password, user.PasswordHash) {
		logger.Warn().Str("username", req.Username).Msg("Contraseña incorrecta")
		return nil, domain.ErrInvalidCredentials
	}

	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		logger.Error().Err(err).Msg("Error generando access token")
		return nil, domain.ErrInternal
	}

	refreshToken, err := s.generateRefreshToken(ctx, user.ID, ipAddr, userAgent)
	if err != nil {
		logger.Error().Err(err).Msg("Error generando refresh token")
		return nil, domain.ErrInternal
	}

	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	logger.Info().Str("id", user.ID.String()).Str("username", user.Username).Msg("Login exitoso")

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    s.config.JWT.ExpiryHours * 3600,
		User:         user.ToUserInfo(),
	}, nil
}

func (s *AuthService) RefreshTokens(ctx context.Context, refreshTokenStr, ipAddr, userAgent string) (*domain.LoginResponse, error) {
	tokenHash := crypto.HashToken(refreshTokenStr)

	token, err := s.tokenRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		logger.Warn().Err(err).Msg("Refresh token no encontrado")
		return nil, domain.ErrInvalidToken
	}

	if token.RevokedAt != nil {
		logger.Warn().Str("token_id", token.ID.String()).Msg("Token revocado")
		return nil, domain.ErrTokenRevoked
	}

	if time.Now().After(token.ExpiresAt) {
		logger.Warn().Str("token_id", token.ID.String()).Msg("Token expirado")
		return nil, domain.ErrTokenExpired
	}

	user, err := s.userRepo.GetByID(ctx, token.UserID)
	if err != nil {
		logger.Error().Err(err).Msg("Usuario del token no encontrado")
		return nil, domain.ErrUserNotFound
	}

	if !user.IsActive {
		return nil, domain.ErrUserInactive
	}

	_ = s.tokenRepo.Revoke(ctx, token.ID)

	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		logger.Error().Err(err).Msg("Error generando nuevo access token")
		return nil, domain.ErrInternal
	}

	newRefreshToken, err := s.generateRefreshToken(ctx, user.ID, ipAddr, userAgent)
	if err != nil {
		logger.Error().Err(err).Msg("Error generando nuevo refresh token")
		return nil, domain.ErrInternal
	}

	logger.Info().Str("user_id", user.ID.String()).Msg("Tokens renovados")

	return &domain.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    s.config.JWT.ExpiryHours * 3600,
		User:         user.ToUserInfo(),
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshTokenStr string) error {
	tokenHash := crypto.HashToken(refreshTokenStr)
	token, err := s.tokenRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil
	}
	logger.Info().Str("token_id", token.ID.String()).Msg("Logout")
	return s.tokenRepo.Revoke(ctx, token.ID)
}

func (s *AuthService) LogoutAll(ctx context.Context, userID uuid.UUID) error {
	logger.Info().Str("user_id", userID.String()).Msg("Logout all devices")
	return s.tokenRepo.RevokeAllForUser(ctx, userID)
}

func (s *AuthService) ValidateToken(tokenStr string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.config.JWT.Secret), nil
	})

	if err != nil {
		return nil, domain.ErrInvalidToken
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, domain.ErrInvalidToken
	}

	return claims, nil
}

func (s *AuthService) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return s.userRepo.GetByID(ctx, id)
}

func (s *AuthService) generateAccessToken(user *domain.User) (string, error) {
	expiresAt := time.Now().Add(time.Duration(s.config.JWT.ExpiryHours) * time.Hour)

	claims := &JWTClaims{
		UserID:   user.ID.String(),
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "telegram-api",
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.JWT.Secret))
}

func (s *AuthService) generateRefreshToken(ctx context.Context, userID uuid.UUID, ipAddr, userAgent string) (string, error) {
	tokenBytes, err := crypto.GenerateRandomBytes(32)
	if err != nil {
		return "", err
	}
	tokenStr := crypto.HashToken(string(tokenBytes))

	refreshToken := &domain.RefreshToken{
		ID:         uuid.New(),
		UserID:     userID,
		TokenHash:  crypto.HashToken(tokenStr),
		DeviceInfo: userAgent,
		IPAddress:  ipAddr,
		ExpiresAt:  time.Now().Add(30 * 24 * time.Hour),
		CreatedAt:  time.Now(),
	}

	if err := s.tokenRepo.Create(ctx, refreshToken); err != nil {
		logger.Error().Err(err).Msg("Error guardando refresh token")
		return "", err
	}

	return tokenStr, nil
}