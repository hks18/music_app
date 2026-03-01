# 🎵 Music Room Backend (Django + YouTube + Supabase)

A Django backend for synchronized YouTube listening rooms. Multiple users join the same room and watch/listen to the **same YouTube video in real-time** via WebSockets. Supabase (PostgreSQL) stores all data and logs events.

---

## 📁 Project Structure

```
backend/
├── README.md
├── requirements.txt
├── supabase/
│   └── schema.sql              ← Run once in Supabase SQL Editor
└── music_room/
    ├── manage.py
    ├── .env.example
    ├── music_room/
    │   ├── settings.py         ← YouTube API key + Supabase DB config
    │   ├── supabase_client.py  ← Reusable Supabase SDK singleton
    │   ├── urls.py
    │   ├── asgi.py
    │   └── wsgi.py
    ├── rooms/                  ← Room management + WebSocket
    │   ├── models.py           ← Room (video_id, progress_ms, etc.)
    │   ├── views.py            ← REST API + Supabase event logging
    │   ├── consumers.py        ← WebSocket: real-time video sync
    │   ├── serializers.py
    │   ├── routing.py
    │   └── urls.py
    └── youtube/                ← YouTube Data API v3 integration
        ├── views.py            ← Search videos, get video details
        └── urls.py
```

---

## 🚀 Setup

### 1. Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Get a YouTube API Key (FREE)
1. Go to https://console.cloud.google.com
2. Create a project → **Enable "YouTube Data API v3"**
3. Credentials → **Create credentials → API Key**
4. Free quota: **10,000 units/day** (a search costs 100 units)

### 3. Set up Supabase
1. Create a free project at https://supabase.com
2. Run `supabase/schema.sql` in **SQL Editor → New Query**
3. From **Settings → Database → URI** copy the Transaction pooler URL (port `6543`)
4. From **Settings → API** copy the Project URL, anon key, service role key

### 4. Configure environment
```bash
cd music_room
cp .env.example .env
# Fill in YOUTUBE_API_KEY, SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 5. Run migrations & start
```bash
python manage.py migrate
daphne -p 8000 music_room.asgi:application
```

> For quick local dev without Supabase, omit `SUPABASE_DB_URL` — falls back to SQLite.

---

## 📡 API Endpoints

### Rooms

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/rooms/create/` | Create room → returns random code |
| POST | `/api/rooms/join/` | Join with `{ "code": "ABC123" }` |
| GET  | `/api/rooms/<code>/` | Room details + current video state |
| POST | `/api/rooms/<code>/leave/` | Leave room |
| POST | `/api/rooms/<code>/playback/` | Host updates video + playback state |
| GET  | `/api/rooms/<code>/members/` | List active members |

#### Playback update body
```json
{
  "video_id":      "dQw4w9WgXcQ",
  "video_title":   "Never Gonna Give You Up",
  "video_channel": "Rick Astley",
  "thumbnail":     "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "is_playing":    true,
  "progress_ms":   12000,
  "duration_ms":   213000
}
```

### YouTube

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/youtube/search/?q=<query>` | Search YouTube for music videos |
| GET | `/youtube/video/<video_id>/` | Get title, duration, thumbnail for a video |

---

## 🔌 WebSocket

```
ws://localhost:8000/ws/room/<ROOM_CODE>/
```

### Server → Client messages

| type | Payload | Description |
|------|---------|-------------|
| `current_state` | video_id, is_playing, progress_ms… | Sent immediately on connect |
| `playback_update` | video_id, is_playing, progress_ms… | Host changed video or play state |
| `member_joined` | member_count | New person joined |
| `member_left` | member_count | Someone left |
| `room_closed` | message | Host left, room closed |
| `sync_request` | requester | Frontend host should push current state |

### Client → Server messages
```json
{ "type": "ping" }
```

---

## 🔄 How Real-Time Sync Works

```
Host device                          Guest devices
    │                                     │
    │  1. Searches /youtube/search/?q=    │
    │  2. Picks a video                   │
    │  3. POST /api/rooms/<code>/playback/│
    │     { video_id, progress_ms, ... }  │
    │                                     │
    │  ── WebSocket broadcast ───────────►│  playback_update received
    │  ── Supabase upsert ───────────────►│  (room_playback table updated)
    │                                     │
    │                                     │  Frontend: YouTube IFrame Player
    │                                     │  → loadVideoById(video_id)
    │                                     │  → seekTo(progress_ms / 1000)
    │                                     │  → playVideo() / pauseVideo()
```

---

## 🗄️ Supabase Tables

| Table | Purpose |
|-------|---------|
| `room_events` | Audit log: room created/closed, members joined/left |
| `room_playback` | Live video state per room, upserted every host sync |
| Django-managed | `rooms_room`, `rooms_roommember`, sessions (auto via `migrate`) |

---

## ✅ Why YouTube > Spotify (Free)

| Feature | YouTube | Spotify Free |
|---------|---------|--------------|
| Full songs | ✅ | ❌ (30s previews only) |
| No login required to listen | ✅ | ❌ |
| Free API | ✅ | ✅ |
| In-browser playback | ✅ (IFrame API) | ❌ (needs app) |
| Playback control | ✅ | ❌ (Premium only) |
