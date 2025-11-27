package telegram

import (
"context"
"fmt"
"strings"
"time"

"telegram-api/internal/domain"

"github.com/gotd/td/telegram"
"github.com/gotd/td/tg"
)

// GetDialogs obtiene la lista de chats/diálogos
func (m *ClientManager) GetDialogs(ctx context.Context, client *telegram.Client, req domain.GetChatsRequest) (*domain.ChatsResponse, error) {
api := client.API()

if req.Limit <= 0 || req.Limit > 100 {
req.Limit = 50
}

result, err := api.MessagesGetDialogs(ctx, &tg.MessagesGetDialogsRequest{
OffsetPeer: &tg.InputPeerEmpty{},
Limit:      req.Limit,
})
if err != nil {
return nil, fmt.Errorf("get dialogs: %w", err)
}

var chats []domain.Chat
var dialogs []tg.DialogClass
var users map[int64]*tg.User
var chatsMap map[int64]*tg.Chat
var channelsMap map[int64]*tg.Channel
var messagesMap map[int]*tg.Message

switch d := result.(type) {
case *tg.MessagesDialogs:
dialogs = d.Dialogs
users = buildUserMap(d.Users)
chatsMap, channelsMap = buildChatMaps(d.Chats)
messagesMap = buildMessageMap(d.Messages)
case *tg.MessagesDialogsSlice:
dialogs = d.Dialogs
users = buildUserMap(d.Users)
chatsMap, channelsMap = buildChatMaps(d.Chats)
messagesMap = buildMessageMap(d.Messages)
default:
return nil, fmt.Errorf("unexpected dialogs type: %T", result)
}

for _, dlg := range dialogs {
dialog, ok := dlg.(*tg.Dialog)
if !ok {
continue
}

chat := m.parseDialog(dialog, users, chatsMap, channelsMap, messagesMap)
if chat != nil {
if !req.Archived && chat.IsArchived {
continue
}
chats = append(chats, *chat)
}
}

return &domain.ChatsResponse{
Chats:      chats,
TotalCount: len(chats),
HasMore:    len(dialogs) == req.Limit,
}, nil
}

func (m *ClientManager) GetChatInfo(ctx context.Context, client *telegram.Client, chatID int64) (*domain.Chat, error) {
api := client.API()

if chatID > 0 {
users, err := api.UsersGetUsers(ctx, []tg.InputUserClass{
&tg.InputUser{UserID: chatID},
})
if err == nil && len(users) > 0 {
if user, ok := users[0].(*tg.User); ok {
return &domain.Chat{
ID:        user.ID,
Type:      domain.ChatTypePrivate,
FirstName: user.FirstName,
LastName:  user.LastName,
Username:  user.Username,
}, nil
}
}
}

if chatID < 0 {
channelID := -chatID
if channelID > 1000000000000 {
channelID = channelID - 1000000000000
}

result, err := api.ChannelsGetChannels(ctx, []tg.InputChannelClass{
&tg.InputChannel{ChannelID: channelID},
})
if err == nil {
if chats, ok := result.(*tg.MessagesChats); ok && len(chats.Chats) > 0 {
if ch, ok := chats.Chats[0].(*tg.Channel); ok {
chatType := domain.ChatTypeSupergroup
if ch.Broadcast {
chatType = domain.ChatTypeChannel
}
return &domain.Chat{
ID:       ch.ID,
Type:     chatType,
Title:    ch.Title,
Username: ch.Username,
}, nil
}
}
}
}

return nil, fmt.Errorf("chat not found: %d", chatID)
}

func (m *ClientManager) GetChatHistory(ctx context.Context, client *telegram.Client, chatID int64, req domain.GetHistoryRequest) (*domain.HistoryResponse, error) {
api := client.API()

if req.Limit <= 0 || req.Limit > 100 {
req.Limit = 50
}

peer, err := m.resolvePeerByID(ctx, api, chatID)
if err != nil {
return nil, fmt.Errorf("resolve peer: %w", err)
}

result, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
Peer:       peer,
Limit:      req.Limit,
OffsetID:   req.OffsetID,
OffsetDate: req.OffsetDate,
})
if err != nil {
return nil, fmt.Errorf("get history: %w", err)
}

var messages []domain.ChatMessage
var msgList []tg.MessageClass
var users map[int64]*tg.User

switch h := result.(type) {
case *tg.MessagesMessages:
msgList = h.Messages
users = buildUserMap(h.Users)
case *tg.MessagesMessagesSlice:
msgList = h.Messages
users = buildUserMap(h.Users)
case *tg.MessagesChannelMessages:
msgList = h.Messages
users = buildUserMap(h.Users)
default:
return nil, fmt.Errorf("unexpected history type: %T", result)
}

for _, m := range msgList {
if msg, ok := m.(*tg.Message); ok {
messages = append(messages, parseMessage(msg, users, chatID))
}
}

return &domain.HistoryResponse{
Messages:   messages,
TotalCount: len(messages),
HasMore:    len(messages) == req.Limit,
}, nil
}

func (m *ClientManager) GetContacts(ctx context.Context, client *telegram.Client) (*domain.ContactsResponse, error) {
api := client.API()

result, err := api.ContactsGetContacts(ctx, 0)
if err != nil {
return nil, fmt.Errorf("get contacts: %w", err)
}

contacts, ok := result.(*tg.ContactsContacts)
if !ok {
return &domain.ContactsResponse{Contacts: []domain.Contact{}, TotalCount: 0}, nil
}

users := buildUserMap(contacts.Users)
var contactList []domain.Contact

for _, c := range contacts.Contacts {
if user, ok := users[c.UserID]; ok {
contact := domain.Contact{
ID:         user.ID,
Phone:      user.Phone,
FirstName:  user.FirstName,
LastName:   user.LastName,
Username:   user.Username,
IsMutual:   c.Mutual,
AccessHash: user.AccessHash,
}

if user.Status != nil {
contact.Status, contact.LastSeenAt = parseUserStatus(user.Status)
}

contactList = append(contactList, contact)
}
}

return &domain.ContactsResponse{
Contacts:   contactList,
TotalCount: len(contactList),
}, nil
}

func (m *ClientManager) ResolveUsername(ctx context.Context, client *telegram.Client, req domain.ResolveRequest) (*domain.ResolvedPeer, error) {
api := client.API()

if req.Username != "" {
username := strings.TrimPrefix(req.Username, "@")
result, err := api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{
Username: username,
})
if err != nil {
return nil, fmt.Errorf("resolve username: %w", err)
}

users := buildUserMap(result.Users)
_, channels := buildChatMaps(result.Chats)

switch p := result.Peer.(type) {
case *tg.PeerUser:
if user, ok := users[p.UserID]; ok {
return &domain.ResolvedPeer{
ID:         user.ID,
Type:       domain.ChatTypePrivate,
Username:   user.Username,
FirstName:  user.FirstName,
LastName:   user.LastName,
Phone:      user.Phone,
AccessHash: user.AccessHash,
IsBot:      user.Bot,
IsVerified: user.Verified,
}, nil
}
case *tg.PeerChannel:
if ch, ok := channels[p.ChannelID]; ok {
chatType := domain.ChatTypeSupergroup
if ch.Broadcast {
chatType = domain.ChatTypeChannel
}
return &domain.ResolvedPeer{
ID:         ch.ID,
Type:       chatType,
Username:   ch.Username,
Title:      ch.Title,
AccessHash: ch.AccessHash,
IsVerified: ch.Verified,
}, nil
}
}

return nil, fmt.Errorf("peer not found for username: %s", username)
}

if req.Phone != "" {
phone := strings.TrimPrefix(req.Phone, "+")
result, err := api.ContactsResolvePhone(ctx, phone)
if err != nil {
return nil, fmt.Errorf("resolve phone: %w", err)
}

users := buildUserMap(result.Users)
if p, ok := result.Peer.(*tg.PeerUser); ok {
if user, ok := users[p.UserID]; ok {
return &domain.ResolvedPeer{
ID:         user.ID,
Type:       domain.ChatTypePrivate,
Username:   user.Username,
FirstName:  user.FirstName,
LastName:   user.LastName,
Phone:      user.Phone,
AccessHash: user.AccessHash,
IsBot:      user.Bot,
}, nil
}
}

return nil, fmt.Errorf("peer not found for phone: %s", phone)
}

return nil, fmt.Errorf("username or phone required")
}

// ==================== HELPERS ====================

func (m *ClientManager) parseDialog(dialog *tg.Dialog, users map[int64]*tg.User, chats map[int64]*tg.Chat, channels map[int64]*tg.Channel, messages map[int]*tg.Message) *domain.Chat {
chat := &domain.Chat{
UnreadCount: dialog.UnreadCount,
IsPinned:    dialog.Pinned,
IsArchived:  dialog.FolderID == 1,
}

if msg, ok := messages[dialog.TopMessage]; ok {
chat.LastMessageID = msg.ID
chat.LastMessage = truncateString(msg.Message, 100)
chat.LastMessageAt = time.Unix(int64(msg.Date), 0)
}

switch p := dialog.Peer.(type) {
case *tg.PeerUser:
if user, ok := users[p.UserID]; ok {
chat.ID = user.ID
chat.Type = domain.ChatTypePrivate
chat.FirstName = user.FirstName
chat.LastName = user.LastName
chat.Username = user.Username
}
case *tg.PeerChat:
if c, ok := chats[p.ChatID]; ok {
chat.ID = c.ID
chat.Type = domain.ChatTypeGroup
chat.Title = c.Title
}
case *tg.PeerChannel:
if ch, ok := channels[p.ChannelID]; ok {
chat.ID = ch.ID
if ch.Broadcast {
chat.Type = domain.ChatTypeChannel
} else {
chat.Type = domain.ChatTypeSupergroup
}
chat.Title = ch.Title
chat.Username = ch.Username
}
default:
return nil
}

return chat
}

func (m *ClientManager) resolvePeerByID(ctx context.Context, api *tg.Client, chatID int64) (tg.InputPeerClass, error) {
if chatID > 0 {
return &tg.InputPeerUser{UserID: chatID}, nil
}

channelID := -chatID
if channelID > 1000000000000 {
channelID = channelID - 1000000000000
}

return &tg.InputPeerChannel{ChannelID: channelID}, nil
}

func buildUserMap(users []tg.UserClass) map[int64]*tg.User {
m := make(map[int64]*tg.User)
for _, u := range users {
if user, ok := u.(*tg.User); ok {
m[user.ID] = user
}
}
return m
}

func buildChatMaps(chats []tg.ChatClass) (map[int64]*tg.Chat, map[int64]*tg.Channel) {
chatMap := make(map[int64]*tg.Chat)
channelMap := make(map[int64]*tg.Channel)
for _, c := range chats {
switch ch := c.(type) {
case *tg.Chat:
chatMap[ch.ID] = ch
case *tg.Channel:
channelMap[ch.ID] = ch
}
}
return chatMap, channelMap
}

func buildMessageMap(messages []tg.MessageClass) map[int]*tg.Message {
m := make(map[int]*tg.Message)
for _, msg := range messages {
if message, ok := msg.(*tg.Message); ok {
m[message.ID] = message
}
}
return m
}

func parseMessage(msg *tg.Message, users map[int64]*tg.User, chatID int64) domain.ChatMessage {
cm := domain.ChatMessage{
ID:         msg.ID,
ChatID:     chatID,
Text:       msg.Message,
Date:       time.Unix(int64(msg.Date), 0),
IsOutgoing: msg.Out,
}

if msg.FromID != nil {
if from, ok := msg.FromID.(*tg.PeerUser); ok {
cm.FromID = from.UserID
if user, ok := users[from.UserID]; ok {
cm.FromName = user.FirstName
if user.LastName != "" {
cm.FromName += " " + user.LastName
}
}
}
}

if reply, ok := msg.GetReplyTo(); ok {
if header, ok := reply.(*tg.MessageReplyHeader); ok {
cm.ReplyToID = header.ReplyToMsgID
}
}

if msg.Media != nil {
switch msg.Media.(type) {
case *tg.MessageMediaPhoto:
cm.MediaType = "photo"
case *tg.MessageMediaDocument:
cm.MediaType = "document"
case *tg.MessageMediaGeo:
cm.MediaType = "location"
case *tg.MessageMediaContact:
cm.MediaType = "contact"
}
}

if fwd, ok := msg.GetFwdFrom(); ok && fwd.FromID != nil {
cm.ForwardFrom = "forwarded"
}

return cm
}

func parseUserStatus(status tg.UserStatusClass) (string, *time.Time) {
switch s := status.(type) {
case *tg.UserStatusOnline:
return "online", nil
case *tg.UserStatusOffline:
t := time.Unix(int64(s.WasOnline), 0)
return "offline", &t
case *tg.UserStatusRecently:
return "recently", nil
case *tg.UserStatusLastWeek:
return "last_week", nil
case *tg.UserStatusLastMonth:
return "last_month", nil
default:
return "unknown", nil
}
}

func truncateString(s string, maxLen int) string {
if len(s) <= maxLen {
return s
}
return s[:maxLen-3] + "..."
}
