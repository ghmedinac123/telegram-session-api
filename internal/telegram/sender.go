package telegram

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"telegram-api/internal/domain"

	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/message"
	"github.com/gotd/td/telegram/message/styling"
	"github.com/gotd/td/telegram/uploader"
	"github.com/gotd/td/tg"
)

func (m *ClientManager) SendMessage(ctx context.Context, sess *domain.TelegramSession, req *domain.SendMessageRequest) error {
	apiHashBytes, err := m.Decrypt(sess.ApiHashEncrypted)
	if err != nil {
		return fmt.Errorf("decrypt api_hash: %w", err)
	}
	apiHash := string(apiHashBytes)

	sessionData, err := m.Decrypt(sess.SessionData)
	if err != nil {
		return fmt.Errorf("decrypt session: %w", err)
	}

	storage := &memorySession{data: sessionData}
	client := telegram.NewClient(sess.ApiID, apiHash, telegram.Options{
		SessionStorage: storage,
	})

	return client.Run(ctx, func(ctx context.Context) error {
		api := client.API()
		sender := message.NewSender(api)

		peer, err := m.resolvePeer(ctx, api, req.To)
		if err != nil {
			return fmt.Errorf("resolve peer: %w", err)
		}

		builder := sender.To(peer)

		switch req.Type {
		case domain.MessageTypeText, "":
			_, err = builder.Text(ctx, req.Text)

		case domain.MessageTypePhoto:
			err = m.sendPhoto(ctx, api, builder, req)

		case domain.MessageTypeVideo:
			err = m.sendVideo(ctx, api, builder, req)

		case domain.MessageTypeAudio:
			err = m.sendAudio(ctx, api, builder, req)

		case domain.MessageTypeFile:
			err = m.sendFile(ctx, api, builder, req)

		default:
			_, err = builder.Text(ctx, req.Text)
		}

		return err
	})
}

func (m *ClientManager) resolvePeer(ctx context.Context, api *tg.Client, to string) (tg.InputPeerClass, error) {
	// Handle @username
	if strings.HasPrefix(to, "@") {
		username := strings.TrimPrefix(to, "@")
		resolved, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{
			Username: username,
		})
		if err != nil {
			return nil, err
		}
		if len(resolved.Users) > 0 {
			user, ok := resolved.Users[0].(*tg.User)
			if ok {
				return &tg.InputPeerUser{UserID: user.ID, AccessHash: user.AccessHash}, nil
			}
		}
		if len(resolved.Chats) > 0 {
			switch chat := resolved.Chats[0].(type) {
			case *tg.Channel:
				return &tg.InputPeerChannel{ChannelID: chat.ID, AccessHash: chat.AccessHash}, nil
			case *tg.Chat:
				return &tg.InputPeerChat{ChatID: chat.ID}, nil
			}
		}
		return nil, fmt.Errorf("peer not found: %s", to)
	}

	// Handle +phone
	if strings.HasPrefix(to, "+") {
		contacts, err := api.ContactsImportContacts(ctx, []tg.InputPhoneContact{
			{Phone: to, FirstName: "Contact", LastName: ""},
		})
		if err != nil {
			return nil, err
		}
		if len(contacts.Users) > 0 {
			user, ok := contacts.Users[0].(*tg.User)
			if ok {
				return &tg.InputPeerUser{UserID: user.ID, AccessHash: user.AccessHash}, nil
			}
		}
		return nil, fmt.Errorf("phone not found: %s", to)
	}

	// Handle numeric ID (user_id or chat_id)
	// Try to parse as int64 for direct peer resolution
	if isNumeric(to) {
		userID, err := parseUserID(to)
		if err != nil {
			return nil, fmt.Errorf("invalid user ID: %s", to)
		}

		// For users, we need to get the access_hash from InputPeerUserFromMessage or dialogs
		// First try to get the user from the dialogs/contacts cache
		inputUsers := []tg.InputUserClass{
			&tg.InputUser{UserID: userID, AccessHash: 0},
		}
		users, err := api.UsersGetUsers(ctx, inputUsers)
		if err == nil && len(users) > 0 {
			if user, ok := users[0].(*tg.User); ok && user.ID != 0 {
				return &tg.InputPeerUser{UserID: user.ID, AccessHash: user.AccessHash}, nil
			}
		}

		// If that doesn't work, try as a chat ID (groups)
		// Negative IDs are typically groups/channels in bot API format
		if userID < 0 {
			// Convert from bot API format to MTProto format
			chatID := -userID
			if chatID > 1000000000000 {
				// It's a channel/supergroup
				channelID := chatID - 1000000000000
				return &tg.InputPeerChannel{ChannelID: channelID, AccessHash: 0}, nil
			}
			return &tg.InputPeerChat{ChatID: chatID}, nil
		}

		// For positive IDs, assume it's a user and try with zero access hash
		// This works if the user is in our contacts or we've interacted before
		return &tg.InputPeerUser{UserID: userID, AccessHash: 0}, nil
	}

	return nil, fmt.Errorf("invalid recipient: use @username, +phone, or numeric ID")
}

// isNumeric checks if a string contains only digits (with optional leading minus)
func isNumeric(s string) bool {
	if len(s) == 0 {
		return false
	}
	start := 0
	if s[0] == '-' {
		start = 1
	}
	if start >= len(s) {
		return false
	}
	for i := start; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

// parseUserID converts a string to int64
func parseUserID(s string) (int64, error) {
	var result int64
	negative := false
	start := 0

	if len(s) > 0 && s[0] == '-' {
		negative = true
		start = 1
	}

	for i := start; i < len(s); i++ {
		result = result*10 + int64(s[i]-'0')
	}

	if negative {
		result = -result
	}
	return result, nil
}

func (m *ClientManager) sendPhoto(ctx context.Context, api *tg.Client, builder *message.RequestBuilder, req *domain.SendMessageRequest) error {
	filePath, err := m.downloadFile(req.MediaURL)
	if err != nil {
		return err
	}
	defer os.Remove(filePath)

	up := uploader.NewUploader(api)
	upload, err := up.FromPath(ctx, filePath)
	if err != nil {
		return err
	}

	text := req.Caption
	if text == "" {
		text = req.Text
	}

	photo := message.UploadedPhoto(upload, styling.Plain(text))
	_, err = builder.Media(ctx, photo)
	return err
}

func (m *ClientManager) sendVideo(ctx context.Context, api *tg.Client, builder *message.RequestBuilder, req *domain.SendMessageRequest) error {
	filePath, err := m.downloadFile(req.MediaURL)
	if err != nil {
		return err
	}
	defer os.Remove(filePath)

	up := uploader.NewUploader(api)
	upload, err := up.FromPath(ctx, filePath)
	if err != nil {
		return err
	}

	text := req.Caption
	if text == "" {
		text = req.Text
	}

	doc := message.UploadedDocument(upload, styling.Plain(text)).
		MIME("video/mp4").
		Filename(filepath.Base(filePath)).
		Video()

	_, err = builder.Media(ctx, doc)
	return err
}

func (m *ClientManager) sendAudio(ctx context.Context, api *tg.Client, builder *message.RequestBuilder, req *domain.SendMessageRequest) error {
	filePath, err := m.downloadFile(req.MediaURL)
	if err != nil {
		return err
	}
	defer os.Remove(filePath)

	up := uploader.NewUploader(api)
	upload, err := up.FromPath(ctx, filePath)
	if err != nil {
		return err
	}

	text := req.Caption
	if text == "" {
		text = req.Text
	}

	doc := message.UploadedDocument(upload, styling.Plain(text)).
		MIME("audio/mpeg").
		Filename(filepath.Base(filePath)).
		Audio()

	_, err = builder.Media(ctx, doc)
	return err
}

func (m *ClientManager) sendFile(ctx context.Context, api *tg.Client, builder *message.RequestBuilder, req *domain.SendMessageRequest) error {
	filePath, err := m.downloadFile(req.MediaURL)
	if err != nil {
		return err
	}
	defer os.Remove(filePath)

	up := uploader.NewUploader(api)
	upload, err := up.FromPath(ctx, filePath)
	if err != nil {
		return err
	}

	text := req.Caption
	if text == "" {
		text = req.Text
	}

	doc := message.UploadedDocument(upload, styling.Plain(text)).
		Filename(filepath.Base(filePath))

	_, err = builder.Media(ctx, doc)
	return err
}

func (m *ClientManager) downloadFile(url string) (string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	ext := filepath.Ext(url)
	if ext == "" {
		ext = ".tmp"
	}

	tmp, err := os.CreateTemp("", "tg-media-*"+ext)
	if err != nil {
		return "", err
	}

	_, err = io.Copy(tmp, resp.Body)
	tmp.Close()

	if err != nil {
		os.Remove(tmp.Name())
		return "", err
	}

	return tmp.Name(), nil
}

type memorySession struct {
	data []byte
}

func (s *memorySession) LoadSession(ctx context.Context) ([]byte, error) {
	return s.data, nil
}

func (s *memorySession) StoreSession(ctx context.Context, data []byte) error {
	s.data = data
	return nil
}