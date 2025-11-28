#!/bin/bash

# ===========================================
# Script de Testing - Telegram API
# ===========================================

BASE_URL="https://backend.telegram-api.fututel.com/api/v1"
SESSION_ID="67719364-a11b-4587-85f3-76f5274b24d0"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIzOWMxYmMzZi1hN2JlLTRmOTYtYWZkNy0yM2M1ZGFhNzg4NjMiLCJ1c2VybmFtZSI6ImdobWVkaW5hYyIsInJvbGUiOiJ1c2VyIiwiaXNzIjoidGVsZWdyYW0tYXBpIiwic3ViIjoiMzljMWJjM2YtYTdiZS00Zjk2LWFmZDctMjNjNWRhYTc4ODYzIiwiZXhwIjoxNzY0MzY5NDM4LCJpYXQiOjE3NjQyODMwMzh9.I3O7tYEAAkcFNteb4LBoxjKPb-9cOwwVa4ltSVMtmQ4"
TO="+573166203787"

echo "============================================"
echo "🧪 FASE 1: TESTING DE MENSAJES"
echo "============================================"

# --- Test 1: Texto ---
echo ""
echo "📝 Test 1: Mensaje de Texto"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/messages/text" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"$TO\", \"text\": \"🧪 Test 1: Mensaje de texto - $(date)\"}" | jq .
sleep 2

# --- Test 2: Foto ---
echo ""
echo "📷 Test 2: Envío de Foto"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/messages/photo" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TO\",
    \"photo_url\": \"https://www.w3schools.com/css/img_5terre.jpg\",
    \"caption\": \"🧪 Test 2: Foto - API Telegram\"
  }" | jq .
sleep 3

# --- Test 3: Video ---
echo ""
echo "🎬 Test 3: Envío de Video"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/messages/video" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TO\",
    \"video_url\": \"https://www.w3schools.com/html/mov_bbb.mp4\",
    \"caption\": \"🧪 Test 3: Video - API Telegram\"
  }" | jq .
sleep 3

# --- Test 4: Audio ---
echo ""
echo "🎵 Test 4: Envío de Audio"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/messages/audio" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TO\",
    \"audio_url\": \"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3\",
    \"caption\": \"🧪 Test 4: Audio - API Telegram\"
  }" | jq .
sleep 3

# --- Test 5: Documento ---
echo ""
echo "📄 Test 5: Envío de Documento"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/messages/file" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$TO\",
    \"file_url\": \"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf\",
    \"caption\": \"🧪 Test 5: Documento PDF - API Telegram\"
  }" | jq .
sleep 2

# --- Test 6: Bulk ---
echo ""
echo "📨 Test 6: Envío Masivo (Bulk)"
echo "-------------------------------------------"
curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/messages/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"recipients\": [\"$TO\"],
    \"text\": \"🧪 Test 6: Mensaje masivo - API Telegram\",
    \"delay_ms\": 1000
  }" | jq .

echo ""
echo "============================================"
echo "🧪 FASE 2: TESTING DE CHATS"
echo "============================================"

# --- Test 7: Listar Chats ---
echo ""
echo "💬 Test 7: Listar Chats"
echo "-------------------------------------------"
CHATS_RESPONSE=$(curl -s -X GET "$BASE_URL/sessions/$SESSION_ID/chats?limit=10" \
  -H "Authorization: Bearer $TOKEN")
echo "$CHATS_RESPONSE" | jq .

# --- Test 8: Resolver Phone ---
echo ""
echo "🔍 Test 8: Resolver Teléfono"
echo "-------------------------------------------"
RESOLVE_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions/$SESSION_ID/resolve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$TO\"}")
echo "$RESOLVE_RESPONSE" | jq .

# Extraer CHAT_ID del resolve
CHAT_ID=$(echo "$RESOLVE_RESPONSE" | jq -r '.data.id // empty')

if [ -n "$CHAT_ID" ] && [ "$CHAT_ID" != "null" ]; then
  # --- Test 9: Info de Chat ---
  echo ""
  echo "ℹ️ Test 9: Info de Chat (ID: $CHAT_ID)"
  echo "-------------------------------------------"
  curl -s -X GET "$BASE_URL/sessions/$SESSION_ID/chats/$CHAT_ID" \
    -H "Authorization: Bearer $TOKEN" | jq .

  # --- Test 10: Historial de Chat ---
  echo ""
  echo "📜 Test 10: Historial de Chat"
  echo "-------------------------------------------"
  curl -s -X GET "$BASE_URL/sessions/$SESSION_ID/chats/$CHAT_ID/history?limit=20" \
    -H "Authorization: Bearer $TOKEN" | jq .
else
  echo ""
  echo "⚠️ No se pudo obtener CHAT_ID del resolve"
fi

# --- Test 11: Contactos ---
echo ""
echo "👥 Test 11: Listar Contactos"
echo "-------------------------------------------"
curl -s -X GET "$BASE_URL/sessions/$SESSION_ID/contacts" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "============================================"
echo "✅ TESTING COMPLETADO"
echo "============================================"