package handler

import (
	"strconv"

	"telegram-api/internal/domain"
	"telegram-api/internal/middleware"
	"telegram-api/internal/service"
	"telegram-api/pkg/logger"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ChatHandler struct {
	chatService *service.ChatService
}

func NewChatHandler(chatService *service.ChatService) *ChatHandler {
	return &ChatHandler{chatService: chatService}
}

func (h *ChatHandler) RegisterRoutes(r fiber.Router) {
	chats := r.Group("/sessions/:id/chats")
	chats.Get("/", h.GetChats)
	chats.Get("/:chatId", h.GetChatInfo)
	chats.Get("/:chatId/history", h.GetChatHistory)

	contacts := r.Group("/sessions/:id/contacts")
	contacts.Get("/", h.GetContacts)

	r.Post("/sessions/:id/resolve", h.ResolvePeer)
	r.Delete("/sessions/:id/cache", h.InvalidateCache) // Nuevo endpoint
}

// GetChats godoc
// @Summary Listar chats
// @Description Obtiene la lista de chats/diálogos de la sesión (con cache Redis)
// @Tags Chats
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param limit query int false "Límite de resultados (default 50, max 100)"
// @Param offset query int false "Offset para paginación"
// @Param archived query bool false "Incluir chats archivados"
// @Param refresh query bool false "Forzar refresh de cache"
// @Success 200 {object} Response{data=domain.ChatsResponse}
// @Router /sessions/{id}/chats [get]
func (h *ChatHandler) GetChats(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID de sesión inválido"))
	}

	userID, err := middleware.GetUserID(c)
	if err != nil {
		return c.Status(401).JSON(NewErrorResponse("UNAUTHORIZED", "No autorizado"))
	}

	req := domain.GetChatsRequest{
		Limit:    c.QueryInt("limit", 50),
		Offset:   c.QueryInt("offset", 0),
		Archived: c.QueryBool("archived", false),
		Refresh:  c.QueryBool("refresh", false),
	}

	logger.Info().
		Str("session_id", sessionID.String()).
		Int("limit", req.Limit).
		Int("offset", req.Offset).
		Bool("refresh", req.Refresh).
		Msg("GET chats")

	result, err := h.chatService.GetDialogs(c.Context(), userID, sessionID, req)
	if err != nil {
		logger.Error().Err(err).Msg("error obteniendo chats")
		return h.handleError(c, err)
	}

	logger.Info().
		Int("returned", len(result.Chats)).
		Int("total", result.TotalCount).
		Bool("from_cache", result.FromCache).
		Msg("chats obtenidos")

	return c.JSON(NewSuccessResponse(result))
}

// GetContacts godoc
// @Summary Listar contactos
// @Description Obtiene la lista de contactos de Telegram (con cache Redis y paginación)
// @Tags Contacts
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param limit query int false "Límite de resultados (default 50, max 200)"
// @Param offset query int false "Offset para paginación"
// @Param refresh query bool false "Forzar refresh de cache"
// @Success 200 {object} Response{data=domain.ContactsResponse}
// @Router /sessions/{id}/contacts [get]
func (h *ChatHandler) GetContacts(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID de sesión inválido"))
	}

	userID, err := middleware.GetUserID(c)
	if err != nil {
		return c.Status(401).JSON(NewErrorResponse("UNAUTHORIZED", "No autorizado"))
	}

	req := domain.GetContactsRequest{
		Limit:   c.QueryInt("limit", 50),
		Offset:  c.QueryInt("offset", 0),
		Refresh: c.QueryBool("refresh", false),
	}

	logger.Info().
		Str("session_id", sessionID.String()).
		Int("limit", req.Limit).
		Int("offset", req.Offset).
		Bool("refresh", req.Refresh).
		Msg("GET contacts")

	result, err := h.chatService.GetContacts(c.Context(), userID, sessionID, req)
	if err != nil {
		logger.Error().Err(err).Msg("error obteniendo contactos")
		return h.handleError(c, err)
	}

	logger.Info().
		Int("returned", len(result.Contacts)).
		Int("total", result.TotalCount).
		Bool("has_more", result.HasMore).
		Bool("from_cache", result.FromCache).
		Msg("contactos obtenidos")

	return c.JSON(NewSuccessResponse(result))
}

// GetChatInfo godoc
// @Summary Obtener información de chat
// @Description Obtiene información detallada de un chat específico (con cache)
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

	userID, err := middleware.GetUserID(c)
	if err != nil {
		return c.Status(401).JSON(NewErrorResponse("UNAUTHORIZED", "No autorizado"))
	}

	logger.Info().
		Str("session_id", sessionID.String()).
		Int64("chat_id", chatID).
		Msg("GET chat info")

	result, err := h.chatService.GetChatInfo(c.Context(), userID, sessionID, chatID)
	if err != nil {
		logger.Error().Err(err).Int64("chat_id", chatID).Msg("error obteniendo chat info")
		return h.handleError(c, err)
	}

	return c.JSON(NewSuccessResponse(result))
}

// GetChatHistory godoc
// @Summary Obtener historial de mensajes
// @Description Obtiene el historial de mensajes de un chat (sin cache - tiempo real)
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

	userID, err := middleware.GetUserID(c)
	if err != nil {
		return c.Status(401).JSON(NewErrorResponse("UNAUTHORIZED", "No autorizado"))
	}

	req := domain.GetHistoryRequest{
		Limit:      c.QueryInt("limit", 50),
		OffsetID:   c.QueryInt("offset_id", 0),
		OffsetDate: c.QueryInt("offset_date", 0),
	}

	logger.Info().
		Str("session_id", sessionID.String()).
		Int64("chat_id", chatID).
		Int("limit", req.Limit).
		Msg("GET chat history")

	result, err := h.chatService.GetChatHistory(c.Context(), userID, sessionID, chatID, req)
	if err != nil {
		logger.Error().Err(err).Int64("chat_id", chatID).Msg("error obteniendo historial")
		return h.handleError(c, err)
	}

	logger.Info().Int("messages", result.TotalCount).Msg("historial obtenido")
	return c.JSON(NewSuccessResponse(result))
}

// ResolvePeer godoc
// @Summary Resolver username o teléfono
// @Description Resuelve un @username o número de teléfono a un peer de Telegram (con cache)
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

	userID, err := middleware.GetUserID(c)
	if err != nil {
		return c.Status(401).JSON(NewErrorResponse("UNAUTHORIZED", "No autorizado"))
	}

	logger.Info().
		Str("session_id", sessionID.String()).
		Str("username", req.Username).
		Str("phone", req.Phone).
		Msg("POST resolve peer")

	result, err := h.chatService.ResolvePeer(c.Context(), userID, sessionID, req)
	if err != nil {
		logger.Error().Err(err).Msg("error resolviendo peer")
		return h.handleError(c, err)
	}

	logger.Info().Int64("peer_id", result.ID).Str("type", string(result.Type)).Msg("peer resuelto")
	return c.JSON(NewSuccessResponse(result))
}

// InvalidateCache godoc
// @Summary Invalidar cache
// @Description Invalida el cache de una sesión (contacts, chats, o all)
// @Tags Cache
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Param type query string false "Tipo de cache a invalidar (contacts, chats, all)" default(all)
// @Success 200 {object} Response
// @Router /sessions/{id}/cache [delete]
func (h *ChatHandler) InvalidateCache(c *fiber.Ctx) error {
	sessionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_ID", "ID de sesión inválido"))
	}

	userID, err := middleware.GetUserID(c)
	if err != nil {
		return c.Status(401).JSON(NewErrorResponse("UNAUTHORIZED", "No autorizado"))
	}

	// Verificar que el usuario tiene acceso a la sesión
	_, err = h.chatService.GetContacts(c.Context(), userID, sessionID, domain.GetContactsRequest{Limit: 1})
	if err != nil {
		return h.handleError(c, err)
	}

	cacheType := c.Query("type", "all")

	if err := h.chatService.InvalidateCache(c.Context(), sessionID, cacheType); err != nil {
		logger.Error().Err(err).Str("type", cacheType).Msg("error invalidando cache")
		return c.Status(500).JSON(NewErrorResponse("CACHE_ERROR", "Error invalidando cache"))
	}

	logger.Info().
		Str("session_id", sessionID.String()).
		Str("type", cacheType).
		Msg("cache invalidado")

	return c.JSON(NewSuccessResponse(fiber.Map{
		"message":    "Cache invalidado correctamente",
		"cache_type": cacheType,
	}))
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