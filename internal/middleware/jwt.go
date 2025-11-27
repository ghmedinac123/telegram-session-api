package middleware

import (
	"strings"

	"telegram-api/internal/domain"
	"telegram-api/internal/service"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const (
	ContextKeyUserID   = "userID"
	ContextKeyUsername = "username"
	ContextKeyRole     = "userRole"
)

func JWTMiddleware(authService *service.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "MISSING_TOKEN",
					"message": "Token de autorización requerido",
				},
			})
		}

		// Extraer token: acepta "Bearer <token>" o solo "<token>"
		token := authHeader
		if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			token = authHeader[7:]
		}

		// Validar token
		claims, err := authService.ValidateToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "INVALID_TOKEN",
					"message": "Token inválido o expirado",
				},
			})
		}

		// Parsear UUID
		userID, err := uuid.Parse(claims.UserID)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "INVALID_TOKEN",
					"message": "Token malformado",
				},
			})
		}

		c.Locals(ContextKeyUserID, userID)
		c.Locals(ContextKeyUsername, claims.Username)
		c.Locals(ContextKeyRole, claims.Role)

		return c.Next()
	}
}

func RequireRole(roles ...domain.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, ok := c.Locals(ContextKeyRole).(domain.Role)
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "FORBIDDEN",
					"message": "Acceso denegado",
				},
			})
		}

		for _, role := range roles {
			if userRole == role {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "FORBIDDEN",
				"message": "No tiene permisos para esta acción",
			},
		})
	}
}

func GetUserID(c *fiber.Ctx) (uuid.UUID, error) {
	userID, ok := c.Locals(ContextKeyUserID).(uuid.UUID)
	if !ok {
		return uuid.Nil, domain.ErrUnauthorized
	}
	return userID, nil
}

func GetUsername(c *fiber.Ctx) string {
	username, _ := c.Locals(ContextKeyUsername).(string)
	return username
}

func GetUserRole(c *fiber.Ctx) domain.Role {
	role, _ := c.Locals(ContextKeyRole).(domain.Role)
	return role
}

func OptionalJWT(authService *service.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Next()
		}

		token := authHeader
		if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			token = authHeader[7:]
		}

		claims, err := authService.ValidateToken(token)
		if err != nil {
			return c.Next()
		}

		userID, err := uuid.Parse(claims.UserID)
		if err != nil {
			return c.Next()
		}

		c.Locals(ContextKeyUserID, userID)
		c.Locals(ContextKeyUsername, claims.Username)
		c.Locals(ContextKeyRole, claims.Role)

		return c.Next()
	}
}