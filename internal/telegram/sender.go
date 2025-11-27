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

	return nil, fmt.Errorf("invalid recipient: use @username or +phone")
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