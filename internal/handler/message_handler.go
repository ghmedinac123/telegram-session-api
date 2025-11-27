package handler

import (
	"telegram-api/internal/domain"
	"telegram-api/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type MessageHandler struct {
	service *service.MessageService
}

func NewMessageHandler(s *service.MessageService) *MessageHandler {
	return &MessageHandler{service: s}
}

func (h *MessageHandler) RegisterRoutes(r fiber.Router) {
	msg := r.Group("/sessions/:id/messages")
	msg.Post("/text", h.SendText)
	msg.Post("/photo", h.SendPhoto)
	msg.Post("/video", h.SendVideo)
	msg.Post("/audio", h.SendAudio)
	msg.Post("/file", h.SendFile)
	msg.Post("/bulk", h.SendBulk)

	r.Get("/messages/:jobId/status", h.GetStatus)
}

// SendText godoc
// @Summary Enviar texto
// @Description Envía mensaje de texto simple
// @Tags Messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param body body domain.TextMessageRequest true "Mensaje de texto"
// @Success 202 {object} Response{data=domain.MessageResponse}
// @Failure 400 {object} Response
// @Failure 404 {object} Response
// @Router /sessions/{id}/messages/text [post]
func (h *MessageHandler) SendText(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	var req domain.TextMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	if req.To == "" || req.Text == "" {
		return c.Status(400).JSON(NewErrorResponse("VALIDATION", "Campos 'to' y 'text' requeridos"))
	}

	internal := &domain.SendMessageRequest{
		To:   req.To,
		Text: req.Text,
		Type: domain.MessageTypeText,
	}

	resp, err := h.service.SendMessage(c.Context(), sessionID, internal)
	if err != nil {
		return handleMessageError(c, err)
	}

	return c.Status(202).JSON(NewSuccessResponse(resp))
}

// SendPhoto godoc
// @Summary Enviar foto
// @Description Envía imagen con caption opcional
// @Tags Messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param body body domain.PhotoMessageRequest true "Foto"
// @Success 202 {object} Response{data=domain.MessageResponse}
// @Failure 400 {object} Response
// @Router /sessions/{id}/messages/photo [post]
func (h *MessageHandler) SendPhoto(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	var req domain.PhotoMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	if req.To == "" || req.PhotoURL == "" {
		return c.Status(400).JSON(NewErrorResponse("VALIDATION", "Campos 'to' y 'photo_url' requeridos"))
	}

	internal := &domain.SendMessageRequest{
		To:       req.To,
		Type:     domain.MessageTypePhoto,
		MediaURL: req.PhotoURL,
		Caption:  req.Caption,
	}

	resp, err := h.service.SendMessage(c.Context(), sessionID, internal)
	if err != nil {
		return handleMessageError(c, err)
	}

	return c.Status(202).JSON(NewSuccessResponse(resp))
}

// SendVideo godoc
// @Summary Enviar video
// @Description Envía video con caption opcional
// @Tags Messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param body body domain.VideoMessageRequest true "Video"
// @Success 202 {object} Response{data=domain.MessageResponse}
// @Failure 400 {object} Response
// @Router /sessions/{id}/messages/video [post]
func (h *MessageHandler) SendVideo(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	var req domain.VideoMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	if req.To == "" || req.VideoURL == "" {
		return c.Status(400).JSON(NewErrorResponse("VALIDATION", "Campos 'to' y 'video_url' requeridos"))
	}

	internal := &domain.SendMessageRequest{
		To:       req.To,
		Type:     domain.MessageTypeVideo,
		MediaURL: req.VideoURL,
		Caption:  req.Caption,
	}

	resp, err := h.service.SendMessage(c.Context(), sessionID, internal)
	if err != nil {
		return handleMessageError(c, err)
	}

	return c.Status(202).JSON(NewSuccessResponse(resp))
}

// SendAudio godoc
// @Summary Enviar audio
// @Description Envía archivo de audio
// @Tags Messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param body body domain.AudioMessageRequest true "Audio"
// @Success 202 {object} Response{data=domain.MessageResponse}
// @Failure 400 {object} Response
// @Router /sessions/{id}/messages/audio [post]
func (h *MessageHandler) SendAudio(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	var req domain.AudioMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	if req.To == "" || req.AudioURL == "" {
		return c.Status(400).JSON(NewErrorResponse("VALIDATION", "Campos 'to' y 'audio_url' requeridos"))
	}

	internal := &domain.SendMessageRequest{
		To:       req.To,
		Type:     domain.MessageTypeAudio,
		MediaURL: req.AudioURL,
		Caption:  req.Caption,
	}

	resp, err := h.service.SendMessage(c.Context(), sessionID, internal)
	if err != nil {
		return handleMessageError(c, err)
	}

	return c.Status(202).JSON(NewSuccessResponse(resp))
}

// SendFile godoc
// @Summary Enviar documento
// @Description Envía archivo/documento
// @Tags Messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param body body domain.FileMessageRequest true "Archivo"
// @Success 202 {object} Response{data=domain.MessageResponse}
// @Failure 400 {object} Response
// @Router /sessions/{id}/messages/file [post]
func (h *MessageHandler) SendFile(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	var req domain.FileMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	if req.To == "" || req.FileURL == "" {
		return c.Status(400).JSON(NewErrorResponse("VALIDATION", "Campos 'to' y 'file_url' requeridos"))
	}

	internal := &domain.SendMessageRequest{
		To:       req.To,
		Type:     domain.MessageTypeFile,
		MediaURL: req.FileURL,
		Caption:  req.Caption,
	}

	resp, err := h.service.SendMessage(c.Context(), sessionID, internal)
	if err != nil {
		return handleMessageError(c, err)
	}

	return c.Status(202).JSON(NewSuccessResponse(resp))
}

// SendBulk godoc
// @Summary Envío masivo
// @Description Envía mensaje de texto a múltiples destinatarios con delay
// @Tags Messages
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param body body domain.BulkTextRequest true "Mensaje masivo"
// @Success 202 {object} Response{data=[]domain.MessageResponse}
// @Failure 400 {object} Response
// @Router /sessions/{id}/messages/bulk [post]
func (h *MessageHandler) SendBulk(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID inválido"))
	}

	var req domain.BulkTextRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	if len(req.Recipients) == 0 || req.Text == "" {
		return c.Status(400).JSON(NewErrorResponse("VALIDATION", "Campos 'recipients' y 'text' requeridos"))
	}

	internal := &domain.BulkMessageRequest{
		Recipients: req.Recipients,
		Text:       req.Text,
		Type:       domain.MessageTypeText,
		DelayMs:    req.DelayMs,
	}

	resp, err := h.service.SendBulk(c.Context(), sessionID, internal)
	if err != nil {
		return handleMessageError(c, err)
	}

	return c.Status(202).JSON(NewSuccessResponse(resp))
}

// GetStatus godoc
// @Summary Estado del mensaje
// @Description Consulta estado de un mensaje enviado
// @Tags Messages
// @Produce json
// @Security BearerAuth
// @Param jobId path string true "Job ID"
// @Success 200 {object} Response{data=domain.MessageJob}
// @Failure 404 {object} Response
// @Router /messages/{jobId}/status [get]
func (h *MessageHandler) GetStatus(c *fiber.Ctx) error {
	jobID := c.Params("jobId")

	job, err := h.service.GetJobStatus(c.Context(), jobID)
	if err != nil {
		return c.Status(404).JSON(NewErrorResponse("NOT_FOUND", "Job no encontrado"))
	}

	return c.JSON(NewSuccessResponse(job))
}

func handleMessageError(c *fiber.Ctx, err error) error {
	switch err {
	case domain.ErrSessionNotFound:
		return c.Status(404).JSON(NewErrorResponse("NOT_FOUND", "Sesión no encontrada"))
	case domain.ErrSessionNotActive:
		return c.Status(400).JSON(NewErrorResponse("SESSION_INACTIVE", "Sesión no autenticada"))
	default:
		if appErr, ok := err.(*domain.AppError); ok {
			return c.Status(appErr.Status).JSON(NewErrorResponse(appErr.Code, appErr.Message))
		}
		return c.Status(500).JSON(NewErrorResponse("INTERNAL", err.Error()))
	}
}