package postgres

import (
	"telegram-api/internal/domain"
	"telegram-api/pkg/logger"

	"github.com/jackc/pgx/v5/pgconn"
)

func wrapDBError(err error, op string) error {
	if err == nil {
		return nil
	}

	// Loggear SIEMPRE el error original
	if pgErr, ok := err.(*pgconn.PgError); ok {
		logger.Error().
			Err(err).
			Str("operation", op).
			Str("pg_code", pgErr.Code).
			Str("pg_message", pgErr.Message).
			Str("pg_detail", pgErr.Detail).
			Str("pg_constraint", pgErr.ConstraintName).
			Str("pg_table", pgErr.TableName).
			Str("pg_column", pgErr.ColumnName).
			Msg("❌ Error PostgreSQL")

		switch pgErr.Code {
		case "23505": // unique_violation
			if pgErr.ConstraintName == "users_username_key" {
				return domain.ErrUserAlreadyExists
			}
			if pgErr.ConstraintName == "users_email_key" {
				return domain.ErrEmailAlreadyExists
			}
			// Cualquier otra violación única
			logger.Warn().
				Str("constraint", pgErr.ConstraintName).
				Msg("⚠️ Violación de constraint único no manejada")
		}
	} else {
		// Error no-PostgreSQL
		logger.Error().
			Err(err).
			Str("operation", op).
			Msg("❌ Error de base de datos (no-PG)")
	}

	return domain.ErrDatabase
}