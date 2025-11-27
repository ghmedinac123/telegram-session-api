package domain

import (
"errors"
"fmt"
)

var (
// Errores de Usuario
ErrUserNotFound       = errors.New("usuario no encontrado")
ErrUserAlreadyExists  = errors.New("el usuario ya existe")
ErrEmailAlreadyExists = errors.New("el email ya está registrado")
ErrInvalidCredentials = errors.New("credenciales inválidas")
ErrUserInactive       = errors.New("usuario desactivado")

// Errores de Autenticación
ErrInvalidToken   = errors.New("token inválido")
ErrTokenExpired   = errors.New("token expirado")
ErrTokenRevoked   = errors.New("token revocado")
ErrUnauthorized   = errors.New("no autorizado")
ErrForbidden      = errors.New("acceso denegado")

// Errores de Sesión Telegram
ErrSessionNotFound         = errors.New("sesión no encontrada")
ErrSessionAlreadyExists    = errors.New("ya existe una sesión con este número")
ErrSessionNotActive        = errors.New("sesión no activa")
ErrSessionNotAuthenticated = errors.New("sesión no autenticada")
ErrSessionInactive         = errors.New("sesión inactiva")
ErrInvalidPhoneNumber      = errors.New("número de teléfono inválido")
ErrInvalidCode             = errors.New("código de verificación inválido")
ErrCodeExpired             = errors.New("código de verificación expirado")
ErrPasswordRequired        = errors.New("se requiere contraseña 2FA")
ErrInvalidPassword         = errors.New("contraseña 2FA incorrecta")
ErrTelegramError           = errors.New("error de Telegram")
ErrTelegramFloodWait       = errors.New("demasiados intentos, espere")

// Errores de Mensajes
ErrMessageNotFound   = errors.New("mensaje no encontrado")
ErrChatNotFound      = errors.New("chat no encontrado")
ErrPeerNotFound      = errors.New("destinatario no encontrado")
ErrMediaNotSupported = errors.New("tipo de media no soportado")

// Errores de Validación
ErrValidation   = errors.New("error de validación")
ErrInvalidInput = errors.New("entrada inválida")

// Errores de Sistema
ErrInternal          = errors.New("error interno del servidor")
ErrDatabase          = errors.New("error de base de datos")
ErrCache             = errors.New("error de caché")
ErrRateLimitExceeded = errors.New("límite de peticiones excedido")
)

type AppError struct {
Err     error
Message string
Code    string
Status  int
Details map[string]interface{}
}

type QRExpiredError struct {
NewQR       string
Attempt     int
MaxAttempts int
SessionID   string
SessionName string
}

func (e *QRExpiredError) Error() string {
return fmt.Sprintf("QR expirado. Intento %d/%d", e.Attempt, e.MaxAttempts)
}

func (e *AppError) Error() string {
if e.Message != "" {
return e.Message
}
return e.Err.Error()
}

func (e *AppError) Unwrap() error {
return e.Err
}

func NewAppError(err error, message string, status int) *AppError {
return &AppError{Err: err, Message: message, Status: status}
}

func (e *AppError) WithCode(code string) *AppError {
e.Code = code
return e
}

func (e *AppError) WithDetails(details map[string]interface{}) *AppError {
e.Details = details
return e
}
