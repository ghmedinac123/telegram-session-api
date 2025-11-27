package handler

import (
	"telegram-api/internal/domain"
	"telegram-api/internal/middleware"
	"telegram-api/internal/service"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) RegisterRoutes(r fiber.Router) {
	auth := r.Group("/auth")
	auth.Post("/register", h.Register)
	auth.Post("/login", h.Login)
	auth.Post("/refresh", h.Refresh)
	auth.Post("/logout", middleware.JWTMiddleware(h.auth), h.Logout)
	auth.Get("/me", middleware.JWTMiddleware(h.auth), h.Me)
}

// Register godoc
// @Summary Registrar usuario
// @Description Crea una nueva cuenta de usuario
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body domain.CreateUserRequest true "Datos del usuario"
// @Success 201 {object} handler.Response{data=domain.UserInfo}
// @Failure 400 {object} handler.Response
// @Failure 409 {object} handler.Response
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req domain.CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "Cuerpo inválido"))
	}
	if errs := ValidateStruct(&req); errs != nil {
		return c.Status(400).JSON(Response{Success: false, Error: &ErrorResponse{Code: "VALIDATION", Details: errs}})
	}
	user, err := h.auth.Register(c.Context(), &req)
	if err != nil {
		return handleErr(c, err)
	}
	return c.Status(201).JSON(NewSuccessResponse(user.ToUserInfo()))
}

// Login godoc
// @Summary Login
// @Description Autentica usuario y retorna tokens
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body domain.LoginRequest true "Credenciales"
// @Success 200 {object} handler.Response{data=domain.LoginResponse}
// @Failure 401 {object} handler.Response
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "Cuerpo inválido"))
	}
	resp, err := h.auth.Login(c.Context(), &req, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return handleErr(c, err)
	}
	return c.JSON(NewSuccessResponse(resp))
}

// Refresh godoc
// @Summary Renovar tokens
// @Description Genera nuevos tokens usando refresh token
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body object{refresh_token=string} true "Refresh token"
// @Success 200 {object} handler.Response{data=domain.LoginResponse}
// @Failure 401 {object} handler.Response
// @Router /auth/refresh [post]
func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(NewErrorResponse("INVALID_BODY", "Cuerpo inválido"))
	}
	resp, err := h.auth.RefreshTokens(c.Context(), req.RefreshToken, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return handleErr(c, err)
	}
	return c.JSON(NewSuccessResponse(resp))
}

// Logout godoc
// @Summary Cerrar sesión
// @Description Revoca el refresh token
// @Tags Auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body object{refresh_token=string} true "Refresh token"
// @Success 200 {object} handler.Response
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	c.BodyParser(&req)
	h.auth.Logout(c.Context(), req.RefreshToken)
	return c.JSON(NewSuccessResponse(fiber.Map{"message": "ok"}))
}

// Me godoc
// @Summary Info usuario actual
// @Description Retorna información del usuario autenticado
// @Tags Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} handler.Response{data=domain.UserInfo}
// @Failure 401 {object} handler.Response
// @Router /auth/me [get]
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID, _ := middleware.GetUserID(c)
	user, err := h.auth.GetUserByID(c.Context(), userID)
	if err != nil {
		return c.Status(404).JSON(NewErrorResponse("NOT_FOUND", "Usuario no encontrado"))
	}
	return c.JSON(NewSuccessResponse(user.ToUserInfo()))
}

func handleErr(c *fiber.Ctx, err error) error {
	switch err {
	case domain.ErrUserAlreadyExists, domain.ErrEmailAlreadyExists:
		return c.Status(409).JSON(NewErrorResponse("CONFLICT", err.Error()))
	case domain.ErrInvalidCredentials, domain.ErrInvalidToken, domain.ErrTokenExpired:
		return c.Status(401).JSON(NewErrorResponse("UNAUTHORIZED", err.Error()))
	case domain.ErrUserInactive:
		return c.Status(403).JSON(NewErrorResponse("FORBIDDEN", err.Error()))
	default:
		return c.Status(500).JSON(NewErrorResponse("INTERNAL", "Error interno"))
	}
}