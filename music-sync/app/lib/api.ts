const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://hksslizz.onrender.com';

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function createRoom() {
  const res = await fetch(`${API_URL}/api/rooms/create/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to create room');
  return res.json(); // { room: { code, ... } }
}

export async function joinRoom(code: string) {
  const res = await fetch(`${API_URL}/api/rooms/join/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.toUpperCase() }),
  });
  if (res.status === 404) throw new Error('Room not found. Check the code and try again.');
  if (!res.ok) throw new Error('Failed to join room');
  return res.json(); // { room: { code, ... } }
}

export async function leaveRoom(code: string) {
  await fetch(`${API_URL}/api/rooms/${code}/leave/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getRoomDetails(code: string) {
  const res = await fetch(`${API_URL}/api/rooms/${code}/`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Room not found');
  return res.json();
}

export interface PlaybackPayload {
  video_id: string;
  video_title: string;
  video_channel: string;
  thumbnail: string;
  is_playing: boolean;
  progress_ms: number;
  duration_ms: number;
}

export async function updatePlayback(code: string, payload: PlaybackPayload) {
  const res = await fetch(`${API_URL}/api/rooms/${code}/playback/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update playback');
  return res.json();
}

export async function getRoomMembers(code: string) {
  const res = await fetch(`${API_URL}/api/rooms/${code}/members/`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json(); // { member_count, members: [...] }
}

// ─── YouTube ──────────────────────────────────────────────────────────────────

export interface YTVideo {
  video_id: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
}

export async function searchYouTube(query: string): Promise<YTVideo[]> {
  const res = await fetch(
    `${API_URL}/youtube/search/?q=${encodeURIComponent(query)}`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('YouTube search failed');
  const data = await res.json();
  return data.results ?? data; // backend returns { results: [...] } or [...]
}
