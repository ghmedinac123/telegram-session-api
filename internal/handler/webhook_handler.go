package handler

import (
	"time"

	"telegram-api/internal/domain"
	"telegram-api/internal/telegram"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type WebhookHandler struct {
	webhookRepo domain.WebhookRepository
	sessionRepo domain.SessionRepository
	pool        *telegram.SessionPool
}

func NewWebhookHandler(
	webhookRepo domain.WebhookRepository,
	sessionRepo domain.SessionRepository,
	pool *telegram.SessionPool,
) *WebhookHandler {
	return &WebhookHandler{
		webhookRepo: webhookRepo,
		sessionRepo: sessionRepo,
		pool:        pool,
	}
}

func (h *WebhookHandler) RegisterRoutes(r fiber.Router) {
	wh := r.Group("/sessions/:id/webhook")
	wh.Post("/", h.Configure)
	wh.Get("/", h.Get)
	wh.Delete("/", h.Delete)
	wh.Post("/start", h.StartListening)
	wh.Post("/stop", h.StopListening)

	// Info del pool
	r.Get("/pool/status", h.PoolStatus)
}

// Configure godoc
// @Summary Configurar webhook
// @Description Configura URL de webhook para recibir eventos de la sesión
// @Tags Webhooks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param body body domain.WebhookCreateRequest true "Configuración"
// @Success 200 {object} Response{data=domain.WebhookResponse}
// @Router /sessions/{id}/webhook [post]
func (h *WebhookHandler) Configure(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	// Verificar que la sesión existe y está activa
	sess, err := h.sessionRepo.GetByID(c.Context(), sessionID)
	if err != nil {
		return c.Status(404).JSON(NewErrorResponse("NOT_FOUND", "Sesión no encontrada"))
	}
	if !sess.IsActive {
		return c.Status(400).JSON(NewErrorResponse("SESSION_INACTIVE", "La sesión no está autenticada"))
	}

	var req domain.WebhookCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	if req.URL == "" {
		return c.Status(400).JSON(NewErrorResponse("VALIDATION", "URL requerida"))
	}

	// Valores por defecto
	if req.MaxRetries == 0 {
		req.MaxRetries = 3
	}
	if req.TimeoutMs == 0 {
		req.TimeoutMs = 5000
	}

	now := time.Now()
	webhook := &domain.WebhookConfig{
		ID:         uuid.New(),
		SessionID:  sessionID,
		URL:        req.URL,
		Secret:     req.Secret,
		Events:     req.Events,
		IsActive:   true,
		MaxRetries: req.MaxRetries,
		TimeoutMs:  req.TimeoutMs,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := h.webhookRepo.Create(c.Context(), webhook); err != nil {
		return c.Status(500).JSON(NewErrorResponse("INTERNAL", "Error guardando webhook"))
	}

	return c.JSON(NewSuccessResponse(domain.WebhookResponse{
		ID:        webhook.ID,
		SessionID: sessionID,
		URL:       webhook.URL,
		Events:    webhook.Events,
		IsActive:  webhook.IsActive,
	}))
}

// Get godoc
// @Summary Obtener webhook
// @Description Retorna configuración actual del webhook
// @Tags Webhooks
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Success 200 {object} Response{data=domain.WebhookConfig}
// @Router /sessions/{id}/webhook [get]
func (h *WebhookHandler) Get(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	webhook, err := h.webhookRepo.GetBySessionID(c.Context(), sessionID)
	if err != nil {
		return c.Status(500).JSON(NewErrorResponse("INTERNAL", "Error obteniendo webhook"))
	}
	if webhook == nil {
		return c.Status(404).JSON(NewErrorResponse("NOT_FOUND", "Webhook no configurado"))
	}

	return c.JSON(NewSuccessResponse(webhook))
}

// Delete godoc
// @Summary Eliminar webhook
// @Description Elimina configuración de webhook
// @Tags Webhooks
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Success 200 {object} Response
// @Router /sessions/{id}/webhook [delete]
func (h *WebhookHandler) Delete(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	// Detener escucha si está activa
	h.pool.StopSession(sessionID)

	if err := h.webhookRepo.Delete(c.Context(), sessionID); err != nil {
		return c.Status(500).JSON(NewErrorResponse("INTERNAL", "Error eliminando webhook"))
	}

	return c.JSON(NewSuccessResponse(fiber.Map{"deleted": true}))
}

// StartListening godoc
// @Summary Iniciar escucha
// @Description Inicia la escucha de eventos de Telegram para esta sesión
// @Tags Webhooks
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Success 200 {object} Response
// @Router /sessions/{id}/webhook/start [post]
func (h *WebhookHandler) StartListening(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	sess, err := h.sessionRepo.GetByID(c.Context(), sessionID)
	if err != nil {
		return c.Status(404).JSON(NewErrorResponse("NOT_FOUND", "Sesión no encontrada"))
	}
	if !sess.IsActive {
		return c.Status(400).JSON(NewErrorResponse("SESSION_INACTIVE", "La sesión no está autenticada"))
	}

	// Verificar webhook configurado
	webhook, _ := h.webhookRepo.GetBySessionID(c.Context(), sessionID)
	if webhook == nil {
		return c.Status(400).JSON(NewErrorResponse("NO_WEBHOOK", "Configura un webhook primero"))
	}

	if err := h.pool.StartSession(c.Context(), sess); err != nil {
		return c.Status(500).JSON(NewErrorResponse("INTERNAL", err.Error()))
	}

	return c.JSON(NewSuccessResponse(fiber.Map{
		"status":     "listening",
		"session_id": sessionID,
		"webhook":    webhook.URL,
	}))
}

// StopListening godoc
// @Summary Detener escucha
// @Description Detiene la escucha de eventos para esta sesión
// @Tags Webhooks
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Success 200 {object} Response
// @Router /sessions/{id}/webhook/stop [post]
func (h *WebhookHandler) StopListening(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	h.pool.StopSession(sessionID)

	return c.JSON(NewSuccessResponse(fiber.Map{
		"status":     "stopped",
		"session_id": sessionID,
	}))
}

// PoolStatus godoc
// @Summary Estado del pool
// @Description Retorna información de sesiones activas escuchando
// @Tags Webhooks
// @Produce json
// @Security BearerAuth
// @Success 200 {object} Response
// @Router /pool/status [get]
func (h *WebhookHandler) PoolStatus(c *fiber.Ctx) error {
	activeIDs := h.pool.ListActive()

	sessions := make([]fiber.Map, 0, len(activeIDs))
	for _, id := range activeIDs {
		if active, ok := h.pool.GetActiveSession(id); ok {
			sessions = append(sessions, fiber.Map{
				"session_id":   id,
				"session_name": active.SessionName,
				"telegram_id":  active.TelegramID,
				"started_at":   active.StartedAt,
				"is_connected": active.IsConnected,
			})
		}
	}

	return c.JSON(NewSuccessResponse(fiber.Map{
		"active_count": len(sessions),
		"sessions":     sessions,
	}))
}