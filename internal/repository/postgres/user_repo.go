package postgres

import (
	"context"
	"errors"
	"time"

	"telegram-api/internal/domain"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Queries SQL como constantes privadas (Single Responsibility: solo SQL de usuarios)
const (
	queryCreateUser = `
		INSERT INTO users (id, username, email, password_hash, is_active, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	queryGetUserByID = `
		SELECT id, username, email, password_hash, is_active, role, last_login_at, created_at, updated_at
		FROM users WHERE id = $1`

	queryGetUserByUsername = `
		SELECT id, username, email, password_hash, is_active, role, last_login_at, created_at, updated_at
		FROM users WHERE username = $1`

	queryGetUserByEmail = `
		SELECT id, username, email, password_hash, is_active, role, last_login_at, created_at, updated_at
		FROM users WHERE email = $1`

	queryUpdateUser = `
		UPDATE users 
		SET username = $2, email = $3, is_active = $4, role = $5, updated_at = $6
		WHERE id = $1`

	queryUpdateLastLogin = `
		UPDATE users SET last_login_at = $2, updated_at = $2 WHERE id = $1`

	queryDeleteUser = `
		UPDATE users SET is_active = false, updated_at = $2 WHERE id = $1`

	queryExistsByUsername = `
		SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)`

	queryExistsByEmail = `
		SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	queryUpdatePassword = `
		UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1`
)

// UserRepository implementa domain.UserRepository usando PostgreSQL
// Principio: Single Responsibility - Solo maneja operaciones de usuarios
type UserRepository struct {
	pool *pgxpool.Pool
}

// NewUserRepository crea una nueva instancia del repositorio
// Dependency Inversion: Recibe el pool como dependencia
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

// Create crea un nuevo usuario en la base de datos
func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	_, err := r.pool.Exec(ctx, queryCreateUser,
		user.ID,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.IsActive,
		user.Role,
		user.CreatedAt,
		user.UpdatedAt,
	)
	if err != nil {
		return wrapDBError(err, "crear usuario")
	}
	return nil
}

// GetByID obtiene un usuario por su ID
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	user := &domain.User{}
	err := r.pool.QueryRow(ctx, queryGetUserByID, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.IsActive,
		&user.Role,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, wrapDBError(err, "obtener usuario por ID")
	}
	return user, nil
}

// GetByUsername obtiene un usuario por su nombre de usuario
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	user := &domain.User{}
	err := r.pool.QueryRow(ctx, queryGetUserByUsername, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.IsActive,
		&user.Role,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, wrapDBError(err, "obtener usuario por username")
	}
	return user, nil
}

// GetByEmail obtiene un usuario por su email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	user := &domain.User{}
	err := r.pool.QueryRow(ctx, queryGetUserByEmail, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.IsActive,
		&user.Role,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, wrapDBError(err, "obtener usuario por email")
	}
	return user, nil
}

// Update actualiza los datos de un usuario
func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
	result, err := r.pool.Exec(ctx, queryUpdateUser,
		user.ID,
		user.Username,
		user.Email,
		user.IsActive,
		user.Role,
		time.Now(),
	)
	if err != nil {
		return wrapDBError(err, "actualizar usuario")
	}
	if result.RowsAffected() == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

// UpdateLastLogin actualiza la fecha del último login
func (r *UserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, queryUpdateLastLogin, id, time.Now())
	if err != nil {
		return wrapDBError(err, "actualizar último login")
	}
	return nil
}

// Delete realiza un soft delete del usuario
func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.pool.Exec(ctx, queryDeleteUser, id, time.Now())
	if err != nil {
		return wrapDBError(err, "eliminar usuario")
	}
	if result.RowsAffected() == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

// ExistsByUsername verifica si existe un usuario con ese username
func (r *UserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByUsername, username).Scan(&exists)
	if err != nil {
		return false, wrapDBError(err, "verificar existencia por username")
	}
	return exists, nil
}

// ExistsByEmail verifica si existe un usuario con ese email
func (r *UserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByEmail, email).Scan(&exists)
	if err != nil {
		return false, wrapDBError(err, "verificar existencia por email")
	}
	return exists, nil
}

// UpdatePassword actualiza la contraseña de un usuario
func (r *UserRepository) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	result, err := r.pool.Exec(ctx, queryUpdatePassword, id, passwordHash, time.Now())
	if err != nil {
		return wrapDBError(err, "actualizar contraseña")
	}
	if result.RowsAffected() == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

// Verificación en tiempo de compilación de que implementa la interfaz
var _ domain.UserRepository = (*UserRepository)(nil)