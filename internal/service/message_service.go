package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"telegram-api/internal/domain"
	"telegram-api/internal/telegram"
	"telegram-api/pkg/logger"

	"github.com/google/uuid"
)

type MessageService struct {
	sessionRepo domain.SessionRepository
	cache       domain.CacheRepository
	tgManager   *telegram.ClientManager
}

func NewMessageService(
	sRepo domain.SessionRepository,
	cache domain.CacheRepository,
	tgMgr *telegram.ClientManager,
) *MessageService {
	return &MessageService{
		sessionRepo: sRepo,
		cache:       cache,
		tgManager:   tgMgr,
	}
}

const (
	queueKey    = "tg:msg:queue"
	jobPrefix   = "tg:msg:job:"
	jobTTL      = 86400 // 24 horas
)

func (s *MessageService) SendMessage(ctx context.Context, sessionID uuid.UUID, req *domain.SendMessageRequest) (*domain.MessageResponse, error) {
	sess, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	if !sess.IsActive || sess.AuthState != domain.SessionAuthenticated {
		return nil, domain.ErrSessionNotActive
	}

	if req.Type == "" {
		req.Type = domain.MessageTypeText
	}

	job := &domain.MessageJob{
		ID:        uuid.New().String(),
		SessionID: sessionID,
		To:        req.To,
		Text:      req.Text,
		Type:      req.Type,
		MediaURL:  req.MediaURL,
		Caption:   req.Caption,
		Status:    domain.MessageStatusPending,
		CreatedAt: time.Now(),
	}

	if req.DelayMs > 0 {
		job.SendAt = time.Now().Add(time.Duration(req.DelayMs) * time.Millisecond)
		job.Status = domain.MessageStatusScheduled
	} else {
		job.SendAt = time.Now()
	}

	jobData, _ := json.Marshal(job)
	_ = s.cache.Set(ctx, jobPrefix+job.ID, string(jobData), jobTTL)

	if req.DelayMs > 0 {
		go s.scheduleJob(job)
	} else {
		go s.processJob(job)
	}

	return &domain.MessageResponse{
		JobID:   job.ID,
		Status:  job.Status,
		SendAt:  job.SendAt,
		Message: "Mensaje en cola",
	}, nil
}

func (s *MessageService) SendBulk(ctx context.Context, sessionID uuid.UUID, req *domain.BulkMessageRequest) ([]domain.MessageResponse, error) {
	sess, err := s.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, domain.ErrSessionNotFound
	}

	if !sess.IsActive {
		return nil, domain.ErrSessionNotActive
	}

	var responses []domain.MessageResponse
	delay := req.DelayMs

	for i, recipient := range req.Recipients {
		singleReq := &domain.SendMessageRequest{
			To:       recipient,
			Text:     req.Text,
			Type:     req.Type,
			MediaURL: req.MediaURL,
			Caption:  req.Caption,
			DelayMs:  delay * i,
		}

		resp, err := s.SendMessage(ctx, sessionID, singleReq)
		if err != nil {
			responses = append(responses, domain.MessageResponse{
				Status:  domain.MessageStatusFailed,
				Message: err.Error(),
			})
			continue
		}
		responses = append(responses, *resp)
	}

	return responses, nil
}

func (s *MessageService) GetJobStatus(ctx context.Context, jobID string) (*domain.MessageJob, error) {
	data, err := s.cache.Get(ctx, jobPrefix+jobID)
	if err != nil || data == "" {
		return nil, fmt.Errorf("job not found")
	}

	var job domain.MessageJob
	if err := json.Unmarshal([]byte(data), &job); err != nil {
		return nil, err
	}

	return &job, nil
}

func (s *MessageService) scheduleJob(job *domain.MessageJob) {
	delay := time.Until(job.SendAt)
	if delay > 0 {
		time.Sleep(delay)
	}
	s.processJob(job)
}

func (s *MessageService) processJob(job *domain.MessageJob) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	job.Status = domain.MessageStatusSending
	s.updateJob(ctx, job)

	sess, err := s.sessionRepo.GetByID(ctx, job.SessionID)
	if err != nil {
		job.Status = domain.MessageStatusFailed
		job.Error = "session not found"
		s.updateJob(ctx, job)
		return
	}

	req := &domain.SendMessageRequest{
		To:       job.To,
		Text:     job.Text,
		Type:     job.Type,
		MediaURL: job.MediaURL,
		Caption:  job.Caption,
	}

	if err := s.tgManager.SendMessage(ctx, sess, req); err != nil {
		job.Status = domain.MessageStatusFailed
		job.Error = err.Error()
		logger.Error().Err(err).Str("job", job.ID).Msg("mensaje fallido")
	} else {
		job.Status = domain.MessageStatusSent
		now := time.Now()
		job.SentAt = &now
		logger.Info().Str("job", job.ID).Str("to", job.To).Msg("mensaje enviado")
	}

	s.updateJob(ctx, job)
}

func (s *MessageService) updateJob(ctx context.Context, job *domain.MessageJob) {
	jobData, _ := json.Marshal(job)
	_ = s.cache.Set(ctx, jobPrefix+job.ID, string(jobData), jobTTL)
}