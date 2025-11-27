/// @file telegram-api/internal/domain/user.go
package domain

import (
	"time"

	"github.com/google/uuid"
)

// Role define los roles de usuario en el sistema
type Role string

const (
	RoleAdmin Role = "admin"
	RoleUser  Role = "user"
)

// User representa un administrador de la API
type User struct {
	ID           uuid.UUID  `json:"id"`
	Username     string     `json:"username"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"` // Nunca serializar
	IsActive     bool       `json:"is_active"`
	Role         Role       `json:"role"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// CreateUserRequest representa la petición para crear usuario
type CreateUserRequest struct {
	Username string `json:"username" validate:"required,min=3,max=50,alphanum"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=72"`
}

// LoginRequest representa la petición de login
type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

// LoginResponse representa la respuesta de login exitoso
type LoginResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int       `json:"expires_in"`
	User         *UserInfo `json:"user"`
}

// UserInfo representa información pública del usuario
type UserInfo struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
	Role     Role      `json:"role"`
}

// RefreshToken representa un token de refresco
type RefreshToken struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"user_id"`
	TokenHash  string     `json:"-"`
	DeviceInfo string     `json:"device_info,omitempty"`
	IPAddress  string     `json:"ip_address,omitempty"`
	ExpiresAt  time.Time  `json:"expires_at"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ToUserInfo convierte User a UserInfo (datos públicos)
func (u *User) ToUserInfo() *UserInfo {
	return &UserInfo{
		ID:       u.ID,
		Username: u.Username,
		Email:    u.Email,
		Role:     u.Role,
	}
}

// IsAdmin verifica si el usuario es administrador
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}