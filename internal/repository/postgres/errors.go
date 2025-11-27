package postgres

import (
	"fmt"

	"telegram-api/internal/domain"

	"github.com/jackc/pgx/v5/pgconn"
)

func wrapDBError(err error, op string) error {
	if err == nil {
		return nil
	}

	if pgErr, ok := err.(*pgconn.PgError); ok {
		switch pgErr.Code {
		case "23505": // unique_violation
			if pgErr.ConstraintName == "users_username_key" {
				return domain.ErrUserAlreadyExists
			}
			if pgErr.ConstraintName == "users_email_key" {
				return domain.ErrEmailAlreadyExists
			}
		}
	}

	return fmt.Errorf("%s: %w", op, domain.ErrDatabase)
}