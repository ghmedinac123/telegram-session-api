package telegram

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"telegram-api/internal/domain"
	"telegram-api/pkg/logger"

	"github.com/google/uuid"
)

// EventDispatcher envía eventos a webhooks configurados
type EventDispatcher struct {
	webhookRepo domain.WebhookRepository
	httpClient  *http.Client
	eventChan   chan *dispatchJob
}

type dispatchJob struct {
	SessionID uuid.UUID
	Event     domain.WebhookEvent
}

// NewEventDispatcher crea el dispatcher
func NewEventDispatcher(webhookRepo domain.WebhookRepository) *EventDispatcher {
	d := &EventDispatcher{
		webhookRepo: webhookRepo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		eventChan: make(chan *dispatchJob, 1000), // Buffer para 1000 eventos
	}

	// Workers para enviar eventos
	for i := 0; i < 10; i++ {
		go d.worker()
	}

	return d
}

// Dispatch envía un evento
func (d *EventDispatcher) Dispatch(sessionID uuid.UUID, eventType domain.EventType, data interface{}) {
	event := domain.WebhookEvent{
		ID:        uuid.New().String(),
		SessionID: sessionID,
		Type:      eventType,
		Timestamp: time.Now(),
		Data:      data,
	}

	select {
	case d.eventChan <- &dispatchJob{SessionID: sessionID, Event: event}:
	default:
		logger.Warn().
			Str("session_id", sessionID.String()).
			Str("event_type", string(eventType)).
			Msg("⚠️ Buffer de eventos lleno, evento descartado")
	}
}

func (d *EventDispatcher) worker() {
	for job := range d.eventChan {
		d.sendToWebhook(job)
	}
}

func (d *EventDispatcher) sendToWebhook(job *dispatchJob) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Obtener configuración de webhook
	webhook, err := d.webhookRepo.GetBySessionID(ctx, job.SessionID)
	if err != nil || webhook == nil || !webhook.IsActive {
		return // No hay webhook configurado o no está activo
	}

	// Verificar si el evento está en la lista de eventos a enviar
	if !d.shouldSendEvent(webhook.Events, job.Event.Type) {
		return
	}

	// Serializar evento
	payload, err := json.Marshal(job.Event)
	if err != nil {
		logger.Error().Err(err).Msg("Error serializando evento")
		return
	}

	// Crear request
	req, err := http.NewRequestWithContext(ctx, "POST", webhook.URL, bytes.NewReader(payload))
	if err != nil {
		logger.Error().Err(err).Msg("Error creando request")
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Telegram-Event", string(job.Event.Type))
	req.Header.Set("X-Telegram-Session", job.SessionID.String())
	req.Header.Set("X-Telegram-Delivery", job.Event.ID)

	// Firmar con secret si está configurado
	if webhook.Secret != "" {
		signature := d.signPayload(payload, webhook.Secret)
		req.Header.Set("X-Telegram-Signature", signature)
	}

	// Enviar con retries
	maxRetries := webhook.MaxRetries
	if maxRetries == 0 {
		maxRetries = 3
	}

	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		resp, err := d.httpClient.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(attempt) * time.Second) // Backoff
			continue
		}
		resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			logger.Debug().
				Str("session_id", job.SessionID.String()).
				Str("event_type", string(job.Event.Type)).
				Int("status", resp.StatusCode).
				Msg("✅ Evento enviado a webhook")
			return
		}

		lastErr = fmt.Errorf("webhook returned %d", resp.StatusCode)
		time.Sleep(time.Duration(attempt) * time.Second)
	}

	// Falló después de todos los intentos
	logger.Error().
		Err(lastErr).
		Str("session_id", job.SessionID.String()).
		Str("url", webhook.URL).
		Msg("❌ Webhook falló después de reintentos")

	// Actualizar último error en DB
	go d.updateWebhookError(job.SessionID, lastErr.Error())
}

func (d *EventDispatcher) shouldSendEvent(events []string, eventType domain.EventType) bool {
	if len(events) == 0 {
		return true // Si no hay filtro, enviar todos
	}
	for _, e := range events {
		if e == string(eventType) || e == "*" {
			return true
		}
	}
	return false
}

func (d *EventDispatcher) signPayload(payload []byte, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	return "sha256=" + hex.EncodeToString(h.Sum(nil))
}

func (d *EventDispatcher) updateWebhookError(sessionID uuid.UUID, errMsg string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	webhook, err := d.webhookRepo.GetBySessionID(ctx, sessionID)
	if err != nil || webhook == nil {
		return
	}

	now := time.Now()
	webhook.LastErrorAt = &now
	webhook.LastError = errMsg
	_ = d.webhookRepo.Update(ctx, webhook)
}