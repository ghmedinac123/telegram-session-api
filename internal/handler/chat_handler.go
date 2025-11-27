package handler

import (
	"strconv"

	"telegram-api/internal/domain"
	"telegram-api/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ChatHandler maneja operaciones de chats y contactos
type ChatHandler struct {
	chatService *service.ChatService
}

// NewChatHandler crea una nueva instancia
func NewChatHandler(chatService *service.ChatService) *ChatHandler {
	return &ChatHandler{
		chatService: chatService,
	}
}

// RegisterRoutes registra las rutas de chats
func (h *ChatHandler) RegisterRoutes(r fiber.Router) {
	chats := r.Group("/sessions/:id/chats")
	chats.Get("/", h.GetChats)
	chats.Get("/:chatId", h.GetChatInfo)
	chats.Get("/:chatId/history", h.GetChatHistory)

	contacts := r.Group("/sessions/:id/contacts")
	contacts.Get("/", h.GetContacts)

	r.Post("/sessions/:id/resolve", h.ResolvePeer)
}

// GetChats godoc
// @Summary Listar chats
// @Description Obtiene la lista de chats/diálogos de la sesión
// @Tags Chats
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param limit query int false "Límite de resultados (default 50, max 100)"
// @Param offset query int false "Offset para paginación"
// @Param archived query bool false "Incluir chats archivados"
// @Success 200 {object} Response{data=domain.ChatsResponse}
// @Router /sessions/{id}/chats [get]
func (h *ChatHandler) GetChats(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID de sesión inválido"))
	}

	userID := c.Locals("user_id").(uuid.UUID)

	// Parse query params
	req := domain.GetChatsRequest{
		Limit:    c.QueryInt("limit", 50),
		Offset:   c.QueryInt("offset", 0),
		Archived: c.QueryBool("archived", false),
	}

	result, err := h.chatService.GetDialogs(c.Context(), userID, sessionID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(NewSuccessResponse(result))
}

// GetChatInfo godoc
// @Summary Obtener información de chat
// @Description Obtiene información detallada de un chat específico
// @Tags Chats
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param chatId path int true "Chat ID"
// @Success 200 {object} Response{data=domain.Chat}
// @Router /sessions/{id}/chats/{chatId} [get]
func (h *ChatHandler) GetChatInfo(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID de sesión inválido"))
	}

	chatID, err := strconv.ParseInt(c.Params("chatId"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_CHAT_ID", "ID de chat inválido"))
	}

	userID := c.Locals("user_id").(uuid.UUID)

	result, err := h.chatService.GetChatInfo(c.Context(), userID, sessionID, chatID)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(NewSuccessResponse(result))
}

// GetChatHistory godoc
// @Summary Obtener historial de mensajes
// @Description Obtiene el historial de mensajes de un chat
// @Tags Chats
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param chatId path int true "Chat ID"
// @Param limit query int false "Límite de mensajes (default 50, max 100)"
// @Param offset_id query int false "ID del mensaje desde donde empezar"
// @Param offset_date query int false "Timestamp unix desde donde empezar"
// @Success 200 {object} Response{data=domain.HistoryResponse}
// @Router /sessions/{id}/chats/{chatId}/history [get]
func (h *ChatHandler) GetChatHistory(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID de sesión inválido"))
	}

	chatID, err := strconv.ParseInt(c.Params("chatId"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_CHAT_ID", "ID de chat inválido"))
	}

	userID := c.Locals("user_id").(uuid.UUID)

	req := domain.GetHistoryRequest{
		Limit:      c.QueryInt("limit", 50),
		OffsetID:   c.QueryInt("offset_id", 0),
		OffsetDate: c.QueryInt("offset_date", 0),
	}

	result, err := h.chatService.GetChatHistory(c.Context(), userID, sessionID, chatID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(NewSuccessResponse(result))
}

// GetContacts godoc
// @Summary Listar contactos
// @Description Obtiene la lista de contactos de Telegram
// @Tags Contacts
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Success 200 {object} Response{data=domain.ContactsResponse}
// @Router /sessions/{id}/contacts [get]
func (h *ChatHandler) GetContacts(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID de sesión inválido"))
	}

	userID := c.Locals("user_id").(uuid.UUID)

	result, err := h.chatService.GetContacts(c.Context(), userID, sessionID)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(NewSuccessResponse(result))
}

// ResolvePeer godoc
// @Summary Resolver username o teléfono
// @Description Resuelve un @username o número de teléfono a un peer de Telegram
// @Tags Contacts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param body body domain.ResolveRequest true "Username o teléfono"
// @Success 200 {object} Response{data=domain.ResolvedPeer}
// @Router /sessions/{id}/resolve [post]
func (h *ChatHandler) ResolvePeer(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID de sesión inválido"))
	}

	var req domain.ResolveRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "JSON inválido"))
	}

	if req.Username == "" && req.Phone == "" {
		return c.Status(400).JSON(NewErrorResponse("VALIDATION", "Se requiere username o phone"))
	}

	userID := c.Locals("user_id").(uuid.UUID)

	result, err := h.chatService.ResolvePeer(c.Context(), userID, sessionID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	return c.JSON(NewSuccessResponse(result))
}

func (h *ChatHandler) handleError(c *fiber.Ctx, err error) error {
	switch err {
	case domain.ErrSessionNotFound:
		return c.Status(404).JSON(NewErrorResponse("NOT_FOUND", "Sesión no encontrada"))
	case domain.ErrUnauthorized:
		return c.Status(403).JSON(NewErrorResponse("FORBIDDEN", "No tienes acceso a esta sesión"))
	case domain.ErrSessionInactive:
		return c.Status(400).JSON(NewErrorResponse("SESSION_INACTIVE", "La sesión no está autenticada"))
	default:
		return c.Status(500).JSON(NewErrorResponse("INTERNAL", err.Error()))
	}
}