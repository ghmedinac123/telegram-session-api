package handler

import (
	"github.com/go-playground/validator/v10"
)

// Response representa la respuesta estándar de la API
type Response struct {
	Success bool           `json:"success"`
	Data    interface{}    `json:"data,omitempty"`
	Error   *ErrorResponse `json:"error,omitempty"`
	Meta    *MetaResponse  `json:"meta,omitempty"`
}

// ErrorResponse representa un error de la API
type ErrorResponse struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// MetaResponse representa metadatos de paginación
type MetaResponse struct {
	Page       int   `json:"page,omitempty"`
	PerPage    int   `json:"per_page,omitempty"`
	Total      int64 `json:"total,omitempty"`
	TotalPages int   `json:"total_pages,omitempty"`
}

// ValidationError representa un error de validación individual
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// Validador global
var validate = validator.New()

// ValidateStruct valida una estructura y retorna errores formateados
func ValidateStruct(s interface{}) []ValidationError {
	err := validate.Struct(s)
	if err == nil {
		return nil
	}

	var errors []ValidationError
	for _, e := range err.(validator.ValidationErrors) {
		errors = append(errors, ValidationError{
			Field:   e.Field(),
			Message: getValidationMessage(e),
		})
	}
	return errors
}

// getValidationMessage retorna mensaje legible para cada tipo de validación
func getValidationMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return "Este campo es requerido"
	case "email":
		return "Debe ser un email válido"
	case "min":
		return "Debe tener al menos " + e.Param() + " caracteres"
	case "max":
		return "No debe exceder " + e.Param() + " caracteres"
	case "alphanum":
		return "Solo debe contener letras y números"
	case "uuid":
		return "Debe ser un UUID válido"
	case "e164":
		return "Debe ser un número de teléfono válido (formato E.164)"
	case "len":
		return "Debe tener exactamente " + e.Param() + " caracteres"
	default:
		return "Valor inválido"
	}
}

// NewSuccessResponse crea una respuesta exitosa
func NewSuccessResponse(data interface{}) Response {
	return Response{
		Success: true,
		Data:    data,
	}
}

// NewErrorResponse crea una respuesta de error
func NewErrorResponse(code, message string) Response {
	return Response{
		Success: false,
		Error: &ErrorResponse{
			Code:    code,
			Message: message,
		},
	}
}

// NewPaginatedResponse crea una respuesta paginada
func NewPaginatedResponse(data interface{}, page, perPage int, total int64) Response {
	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	return Response{
		Success: true,
		Data:    data,
		Meta: &MetaResponse{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	}
}