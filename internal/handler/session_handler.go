package handler

import (
	"fmt"

	"telegram-api/internal/domain"
	"telegram-api/internal/middleware"
	"telegram-api/internal/service"
	"telegram-api/pkg/logger"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)
type SessionHandler struct {
	service *service.SessionService
}

func NewSessionHandler(s *service.SessionService) *SessionHandler {
	return &SessionHandler{service: s}
}

func (h *SessionHandler) RegisterRoutes(r fiber.Router) {
	sessions := r.Group("/sessions")
	sessions.Post("/", h.Create)
	sessions.Post("/:id/verify", h.VerifyCode)
	sessions.Get("/", h.List)
	sessions.Get("/:id", h.Get)
	sessions.Delete("/:id", h.Delete)
}

// Create godoc
// @Summary Crear sesión Telegram
// @Description Inicia autenticación con Telegram (SMS o QR). Para QR, el sistema escucha automáticamente en background.
// @Tags Sessions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body domain.CreateSessionRequest true "Credenciales Telegram"
// @Success 201 {object} handler.Response
// @Failure 400 {object} handler.Response
// @Failure 409 {object} handler.Response
// @Router /sessions [post]
func (h *SessionHandler) Create(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return c.Status(401).JSON(NewErrorResponse("UNAUTHORIZED", "No autenticado"))
	}

	var req domain.CreateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		logger.Error().Err(err).Msg("❌ Error parseando body en Create session")
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	if errs := ValidateStruct(&req); errs != nil {
		logger.Warn().Interface("errors", errs).Msg("⚠️ Validación fallida en Create session")
		return c.Status(400).JSON(Response{Success: false, Error: &ErrorResponse{Code: "VALIDATION", Details: errs}})
	}

	logger.Debug().
		Str("user_id", userID.String()).
		Str("session_name", req.SessionName).
		Str("auth_method", string(req.AuthMethod)).
		Int("api_id", req.ApiID).
		Msg("📝 Intentando crear sesión...")

	session, data, err := h.service.CreateSession(c.Context(), userID, &req)
	if err != nil {
		return handleSessionError(c, err)
	}

	response := fiber.Map{
		"session": session,
	}

	if req.AuthMethod == domain.AuthMethodQR {
		response["qr_image_base64"] = data
		response["message"] = "QR generado. El sistema escucha automáticamente (3 intentos, 2 min c/u). Use GET /sessions/:id para verificar estado."
	} else {
		response["phone_code_hash"] = data
		response["next_step"] = "POST /sessions/" + session.ID.String() + "/verify con {code}"
	}

	return c.Status(201).JSON(NewSuccessResponse(response))
}

// VerifyCode godoc
// @Summary Verificar código SMS
// @Description Completa autenticación con el código recibido por SMS
// @Tags Sessions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param body body domain.VerifyCodeRequest true "Código SMS"
// @Success 200 {object} handler.Response{data=domain.TelegramSession}
// @Failure 400 {object} handler.Response
// @Failure 410 {object} handler.Response
// @Router /sessions/{id}/verify [post]
func (h *SessionHandler) VerifyCode(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	var req domain.VerifyCodeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	session, err := h.service.VerifyCode(c.Context(), sessionID, req.Code)
	if err != nil {
		return handleSessionError(c, err)
	}

	return c.JSON(NewSuccessResponse(session))
}

// List godoc
// @Summary Listar sesiones
// @Description Retorna todas las sesiones Telegram del usuario
// @Tags Sessions
// @Produce json
// @Security BearerAuth
// @Success 200 {object} handler.Response{data=[]domain.TelegramSession}
// @Router /sessions [get]
func (h *SessionHandler) List(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return c.Status(401).JSON(NewErrorResponse("UNAUTHORIZED", "No autenticado"))
	}

	sessions, err := h.service.ListSessions(c.Context(), userID)
	if err != nil {
		logger.Error().Err(err).Str("user_id", userID.String()).Msg("Error listando sesiones")
		return c.Status(500).JSON(NewErrorResponse("INTERNAL", "Error listando sesiones"))
	}

	return c.JSON(NewSuccessResponse(sessions))
}

// Get godoc
// @Summary Obtener sesión
// @Description Retorna detalle de una sesión. Use para verificar si QR fue escaneado (is_active=true).
// @Tags Sessions
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Success 200 {object} handler.Response{data=domain.TelegramSession}
// @Failure 404 {object} handler.Response
// @Router /sessions/{id} [get]
func (h *SessionHandler) Get(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	session, err := h.service.GetSession(c.Context(), sessionID)
	if err != nil {
		return handleSessionError(c, err)
	}

	response := fiber.Map{
		"session": session,
	}

	if !session.IsActive {
		switch session.AuthState {
		case domain.SessionPending, domain.SessionCodeSent:
			response["status"] = "waiting"
			response["message"] = "Esperando autenticación..."
		case domain.SessionFailed:
			response["status"] = "failed"
			response["message"] = "Autenticación fallida. Cree nueva sesión."
		}
	} else {
		response["status"] = "authenticated"
	}

	return c.JSON(NewSuccessResponse(response))
}

// Delete godoc
// @Summary Eliminar sesión
// @Description Elimina una sesión Telegram
// @Tags Sessions
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Success 200 {object} handler.Response
// @Failure 404 {object} handler.Response
// @Router /sessions/{id} [delete]
func (h *SessionHandler) Delete(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	if err := h.service.DeleteSession(c.Context(), sessionID); err != nil {
		return handleSessionError(c, err)
	}

	return c.JSON(NewSuccessResponse(fiber.Map{"deleted": true}))
}

func handleSessionError(c *fiber.Ctx, err error) error {
	// Primero verificar errores conocidos de dominio
	switch err {
	case domain.ErrSessionNotFound:
		return c.Status(404).JSON(NewErrorResponse("NOT_FOUND", "Sesión no encontrada"))
	case domain.ErrSessionAlreadyExists:
		return c.Status(409).JSON(NewErrorResponse("CONFLICT", "Ya existe sesión con este número"))
	case domain.ErrCodeExpired:
		return c.Status(410).JSON(NewErrorResponse("CODE_EXPIRED", "Código expirado, solicita nuevo"))
	case domain.ErrInvalidCode:
		return c.Status(400).JSON(NewErrorResponse("INVALID_CODE", "Código incorrecto"))
	case domain.ErrInvalidPhoneNumber:
		return c.Status(400).JSON(NewErrorResponse("INVALID_PHONE", "Número de teléfono requerido para SMS"))
	case domain.ErrDatabase:
		logger.Error().Err(err).Msg("❌ Error de base de datos en sesión")
		return c.Status(500).JSON(NewErrorResponse("DATABASE", "Error de base de datos"))
	case domain.ErrInternal:
		logger.Error().Err(err).Msg("❌ Error interno en sesión")
		return c.Status(500).JSON(NewErrorResponse("INTERNAL", "Error interno"))
	}

	// Verificar si es AppError
	if appErr, ok := err.(*domain.AppError); ok {
		logger.Error().
			Err(appErr.Err).
			Str("code", appErr.Code).
			Int("status", appErr.Status).
			Msg("❌ AppError en sesión")
		return c.Status(appErr.Status).JSON(NewErrorResponse(appErr.Code, appErr.Message))
	}

	// Error desconocido - LOGGEAR SIEMPRE
	logger.Error().
		Err(err).
		Str("error_type", fmt.Sprintf("%T", err)).
		Msg("❌ Error NO MANEJADO en sesión")
	
	return c.Status(500).JSON(NewErrorResponse("INTERNAL", "Error interno"))
}