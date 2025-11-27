package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidKey        = errors.New("clave de encriptación inválida")
	ErrDecryptionFailed  = errors.New("fallo al desencriptar datos")
	ErrCiphertextTooShort = errors.New("texto cifrado muy corto")
)

// Crypter maneja operaciones de encriptación/desencriptación
type Crypter struct {
	key []byte
}

// NewCrypter crea una nueva instancia de Crypter
// key debe ser una cadena hexadecimal de 64 caracteres (32 bytes para AES-256)
func NewCrypter(hexKey string) (*Crypter, error) {
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, ErrInvalidKey
	}

	if len(key) != 32 {
		return nil, ErrInvalidKey
	}

	return &Crypter{key: key}, nil
}

// Encrypt encripta datos usando AES-256-GCM
func (c *Crypter) Encrypt(plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(c.key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// Generar nonce aleatorio
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// Encriptar: nonce + ciphertext + tag
	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// Decrypt desencripta datos encriptados con AES-256-GCM
func (c *Crypter) Decrypt(ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(c.key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, ErrCiphertextTooShort
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, ErrDecryptionFailed
	}

	return plaintext, nil
}

// HashPassword genera hash bcrypt de una contraseña
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword verifica si la contraseña coincide con el hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// HashToken genera un hash SHA-256 de un token (para refresh tokens)
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// GenerateRandomBytes genera bytes aleatorios
func GenerateRandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	return b, err
}

// GenerateRandomHex genera una cadena hexadecimal aleatoria
func GenerateRandomHex(length int) (string, error) {
	bytes, err := GenerateRandomBytes(length / 2)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}