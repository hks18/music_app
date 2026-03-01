-- ─────────────────────────────────────────────────────────────
-- Music Room — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────

-- 1. Room events log (append-only audit trail)
CREATE TABLE IF NOT EXISTS room_events (
    id          BIGSERIAL PRIMARY KEY,
    room_code   TEXT NOT NULL,
    event_type  TEXT NOT NULL,  -- 'room_created' | 'member_joined' | 'member_left' | 'room_closed'
    data        JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_room_events_room_code  ON room_events(room_code);
CREATE INDEX IF NOT EXISTS idx_room_events_created_at ON room_events(created_at DESC);

-- 2. Live YouTube playback state per room (upserted on every host sync)
CREATE TABLE IF NOT EXISTS room_playback (
    room_code      TEXT PRIMARY KEY,
    video_id       TEXT,
    video_title    TEXT,
    video_channel  TEXT,
    thumbnail      TEXT,
    is_playing     BOOLEAN DEFAULT FALSE,
    progress_ms    INTEGER DEFAULT 0,
    duration_ms    INTEGER DEFAULT 0,
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on every upsert
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON room_playback;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON room_playback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE room_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_playback ENABLE ROW LEVEL SECURITY;

-- Service role (Django backend) → full access
CREATE POLICY "Service role full access - events"
    ON room_events FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - playback"
    ON room_playback FOR ALL USING (auth.role() = 'service_role');

-- Anon (frontend) → read-only on playback state
CREATE POLICY "Anon read playback"
    ON room_playback FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────
-- NOTE: Django ORM tables (rooms_room, rooms_roommember, etc.)
-- are auto-created by `python manage.py migrate`. No manual SQL needed.
-- ─────────────────────────────────────────────────────────────
