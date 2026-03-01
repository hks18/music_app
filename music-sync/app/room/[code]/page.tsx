'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { leaveRoom, updatePlayback, searchYouTube, getRoomMembers, YTVideo, joinRoom } from '../../lib/api';

// ─── 3-D scene ────────────────────────────────────────────────────────────────

function AudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const barsRef = useRef<THREE.Group>(null);
  const barCount = 32;
  useFrame((state) => {
    if (!barsRef.current) return;
    barsRef.current.children.forEach((bar, i) => {
      const scale = isPlaying
        ? 0.3 + Math.sin(state.clock.elapsedTime * 3 + i * 0.3) * 0.7 + Math.random() * 0.3
        : 0.3;
      bar.scale.y = scale;
      const mat = (bar as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.opacity = 0.3 + scale * 0.5;
    });
  });
  return (
    <group ref={barsRef} position={[0, -2, 0]}>
      {Array.from({ length: barCount }).map((_, i) => (
        <mesh key={i} position={[(i - barCount / 2) * 0.3, 1.5, 0]}>
          <boxGeometry args={[0.15, 3, 0.15]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#00f5ff' : '#ff00aa'}
            transparent opacity={0.6}
            emissive={i % 2 === 0 ? '#00f5ff' : '#ff00aa'}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function FloatingOrbs() {
  return (
    <>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere args={[0.5, 32, 32]} position={[-4, 2, -5]}>
          <meshStandardMaterial color="#8b5cf6" transparent opacity={0.4} wireframe />
        </Sphere>
      </Float>
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
        <Sphere args={[0.3, 32, 32]} position={[4, -1, -4]}>
          <meshStandardMaterial color="#00f5ff" transparent opacity={0.4} wireframe />
        </Sphere>
      </Float>
      <Float speed={2.5} rotationIntensity={0.6} floatIntensity={1.2}>
        <Sphere args={[0.4, 32, 32]} position={[3, 3, -6]}>
          <meshStandardMaterial color="#ff00aa" transparent opacity={0.4} wireframe />
        </Sphere>
      </Float>
    </>
  );
}

// ─── YouTube IFrame types ──────────────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (id: string, config: object) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  loadVideoById(id: string, startSeconds?: number): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allow: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(v: number): void;
  destroy(): void;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = (params.code as string).toUpperCase();

  const [isHost, setIsHost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<YTVideo | null>(null);
  const [memberCount, setMemberCount] = useState(1);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YTVideo[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [queuedState, setQueuedState] = useState<any>(null);

  // IFrame player
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerReadyRef = useRef(false);

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  // ── Detect host ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = localStorage.getItem(`host_${roomCode}`) === 'true';
    setIsHost(h);

    // Ensure session is initialized by joining via API
    joinRoom(roomCode)
      .then((data) => {
        console.log("Joined room successfully via API. Initial state:", data.room);
        const r = data.room;
        if (r.current_video_id) {
          setCurrentVideo({
            video_id: r.current_video_id,
            title: r.current_video_title,
            channel: r.current_video_channel,
            thumbnail: r.current_thumbnail,
            duration: ''
          });
          setIsPlaying(r.is_playing);
          setQueuedState({
            video_id: r.current_video_id,
            is_playing: r.is_playing,
            progress_ms: r.progress_ms
          });
        }
        setHasJoined(true);
      })
      .catch((err) => {
        console.error("Failed to join room via API:", err);
        setHasJoined(true);
      });
  }, [roomCode]);

  // Handle queued state when player becomes ready
  useEffect(() => {
    if (playerReadyRef.current && playerRef.current && queuedState) {
      const { video_id, is_playing, progress_ms } = queuedState;
      playerRef.current.loadVideoById(video_id, progress_ms / 1000);
      if (is_playing && !needsInteraction) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
      setQueuedState(null);
    }
  }, [queuedState, needsInteraction]);

  // Force sync helper
  const forceSync = useCallback(() => {
    if (!isHost || !currentVideo || !playerRef.current || !playerReadyRef.current) return;
    const hostKey = localStorage.getItem(`host_key_${roomCode}`) || undefined;
    updatePlayback(roomCode, {
      video_id: currentVideo.video_id,
      video_title: currentVideo.title,
      video_channel: currentVideo.channel,
      thumbnail: currentVideo.thumbnail,
      is_playing: isPlaying,
      progress_ms: Math.floor(playerRef.current.getCurrentTime() * 1000),
      duration_ms: Math.floor(playerRef.current.getDuration() * 1000),
    }, hostKey).catch(async err => {
      const detail = await err.response?.json().catch(() => ({}));
      console.error("Force sync failed:", err.message, detail);
    });
  }, [isHost, currentVideo, isPlaying, roomCode]);

  // ── Load YouTube IFrame API ──────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('yt-iframe-api')) return;
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('yt-player', {
        height: '0',
        width: '0',
        playerVars: { autoplay: 0, controls: 0 },
        events: {
          onReady: () => { playerReadyRef.current = true; },
          onStateChange: (e: { data: number }) => {
            if (!isHost) return;
            const playing = e.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(playing);
          },
        },
      });
    };

    // If API already loaded
    if (window.YT?.Player) window.onYouTubeIframeAPIReady();
  }, [isHost]);

  // ── WebSocket connection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasJoined) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://hksslizz.onrender.com';
    const proto = API_URL.startsWith('https') ? 'wss' : 'ws';
    const host = API_URL.replace(/^https?:\/\//, '');
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (proto === 'wss' ? `wss://${host}` : `ws://${host}`) || 'wss://hksslizz.onrender.com';

    const ws = new WebSocket(`${WS_URL}/ws/room/${roomCode}/`);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      console.log("WebSocket message received:", msg.type, msg);

      if (msg.type === 'playback_update' || msg.type === 'current_state') {
        const { video_id, video_title, video_channel, thumbnail, is_playing, progress_ms } = msg;
        if (video_id) {
          console.log(`Applying playback sync: ${video_title} (${is_playing ? 'playing' : 'paused'})`);
          setCurrentVideo({ video_id, title: video_title, channel: video_channel, thumbnail, duration: '' });
          setIsPlaying(is_playing);

          if (playerReadyRef.current && playerRef.current) {
            playerRef.current.loadVideoById(video_id, progress_ms / 1000);
            if (is_playing && !needsInteraction) {
              playerRef.current.playVideo();
            } else {
              playerRef.current.pauseVideo();
            }
          } else {
            console.log("Player not ready, queuing sync state...");
            setQueuedState({ video_id, is_playing, progress_ms });
          }
        }
      }

      if (msg.type === 'member_joined' || msg.type === 'member_left') {
        console.log(`Member event: ${msg.type}, count: ${msg.member_count}`);
        setMemberCount(msg.member_count ?? 1);
      }

      if (msg.type === 'sync_request' && isHost) {
        console.log("Received sync request from new guest, pushing state...");
        forceSync();
      }

      if (msg.type === 'room_closed') {
        alert('The host has closed this room.');
        router.push('/');
      }
    };

    // Fetch initial member count
    getRoomMembers(roomCode).then((d) => setMemberCount(d.member_count)).catch(() => { });

    return () => ws.close();
  }, [roomCode, router, hasJoined, needsInteraction, isHost, forceSync]);

  // ── Sync interval (host only) ─────────────────────────────────────────────
  useEffect(() => {
    if (!isHost || !currentVideo) return;
    const interval = setInterval(() => {
      if (!playerRef.current || !playerReadyRef.current) return;
      const hostKey = localStorage.getItem(`host_key_${roomCode}`) || undefined;
      updatePlayback(roomCode, {
        video_id: currentVideo.video_id,
        video_title: currentVideo.title,
        video_channel: currentVideo.channel,
        thumbnail: currentVideo.thumbnail,
        is_playing: isPlaying,
        progress_ms: Math.floor(playerRef.current.getCurrentTime() * 1000),
        duration_ms: Math.floor(playerRef.current.getDuration() * 1000),
      }, hostKey).catch(err => console.error("Sync interval failed:", err));
    }, 2000);
    return () => clearInterval(interval);
  }, [isHost, currentVideo, isPlaying, roomCode]);

  // ── YouTube search ────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchYouTube(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // ── Pick a video (host only) ──────────────────────────────────────────────
  const pickVideo = useCallback(async (video: YTVideo) => {
    setCurrentVideo(video);
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery('');

    if (playerReadyRef.current && playerRef.current) {
      playerRef.current.loadVideoById(video.video_id, 0);
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
    const hostKey = localStorage.getItem(`host_key_${roomCode}`) || undefined;

    await updatePlayback(roomCode, {
      video_id: video.video_id,
      video_title: video.title,
      video_channel: video.channel,
      thumbnail: video.thumbnail,
      is_playing: true,
      progress_ms: 0,
      duration_ms: 0,
    }, hostKey).catch(() => { });
  }, [roomCode]);

  // ── Play / Pause (host only) ──────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    if (!isHost || !playerReadyRef.current || !playerRef.current || !currentVideo) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
    const hostKey = localStorage.getItem(`host_key_${roomCode}`) || undefined;
    await updatePlayback(roomCode, {
      video_id: currentVideo.video_id,
      video_title: currentVideo.title,
      video_channel: currentVideo.channel,
      thumbnail: currentVideo.thumbnail,
      is_playing: !isPlaying,
      progress_ms: Math.floor((playerRef.current?.getCurrentTime() ?? 0) * 1000),
      duration_ms: Math.floor((playerRef.current?.getDuration() ?? 0) * 1000),
    }, hostKey).catch(() => { });
  }, [isHost, isPlaying, currentVideo, roomCode]);

  // ── Leave room ────────────────────────────────────────────────────────────
  const handleExit = useCallback(async () => {
    try { await leaveRoom(roomCode); } catch { }
    localStorage.removeItem(`host_${roomCode}`);
    localStorage.removeItem(`host_key_${roomCode}`);
    router.push('/');
  }, [roomCode, router]);

  const handleJoinSync = () => {
    setNeedsInteraction(false);
    if (playerRef.current && playerReadyRef.current && currentVideo) {
      if (isPlaying) playerRef.current.playVideo();
    }
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const s = {
    canvasWrap: { position: 'fixed' as const, inset: 0, zIndex: 0 },
    ui: {
      position: 'relative' as const, zIndex: 1, minHeight: '100vh',
      display: 'flex', flexDirection: 'column' as const,
    },
    topBar: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 24px',
      background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    },
    roomCode: {
      fontFamily: "'Outfit', monospace", fontSize: '1rem',
      color: '#00f5ff', letterSpacing: '3px',
      background: 'rgba(0,245,255,0.08)', padding: '6px 14px', borderRadius: '8px',
    },
    badge: {
      fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)',
      background: 'rgba(255,255,255,0.07)', padding: '6px 14px', borderRadius: '8px',
    },
    exitBtn: {
      background: 'rgba(255,68,68,0.15)', border: '1px solid rgba(255,68,68,0.3)',
      color: '#ff4444', padding: '8px 18px', borderRadius: '8px',
      cursor: 'pointer', fontSize: '0.9rem', transition: 'all .3s',
    },
    body: {
      flex: 1, display: 'flex', gap: '20px', padding: '20px',
      alignItems: 'flex-start', justifyContent: 'center',
      flexWrap: 'wrap' as const,
    },
    // Player card
    playerCard: {
      background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px',
      padding: '30px', width: '360px', flexShrink: 0 as const,
    },
    albumArt: {
      width: '200px', height: '200px', margin: '0 auto 20px',
      borderRadius: '16px', overflow: 'hidden', position: 'relative' as const,
      background: 'linear-gradient(135deg,#00f5ff,#ff00aa,#8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '4rem', boxShadow: '0 20px 60px rgba(0,245,255,0.3)',
    },
    trackTitle: {
      fontSize: '1.3rem', fontWeight: 700, color: '#fff',
      marginBottom: '4px', textAlign: 'center' as const,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
    },
    artist: {
      fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)',
      marginBottom: '24px', textAlign: 'center' as const,
    },
    controls: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px',
    },
    playBtn: {
      width: '65px', height: '65px', borderRadius: '50%',
      background: isHost
        ? 'linear-gradient(135deg,#00f5ff,#00c4cc)'
        : 'rgba(255,255,255,0.1)',
      border: 'none', color: isHost ? '#0a0a0f' : 'rgba(255,255,255,0.3)',
      fontSize: '1.6rem', cursor: isHost ? 'pointer' : 'not-allowed',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: isHost ? '0 0 30px rgba(0,245,255,0.4)' : 'none',
      transition: 'all .3s',
    },
    guestNote: {
      marginTop: '12px', textAlign: 'center' as const,
      fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)',
    },
    membersRow: {
      display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
      marginTop: '20px', paddingTop: '16px',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem',
    },
    // Search panel
    searchPanel: {
      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px',
      padding: '24px', width: '400px', maxHeight: '80vh',
      display: 'flex', flexDirection: 'column' as const, gap: '14px',
    },
    searchTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#fff' },
    searchForm: { display: 'flex', gap: '8px' },
    searchInput: {
      flex: 1, padding: '10px 14px', borderRadius: '10px',
      background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)',
      color: '#fff', fontSize: '0.95rem', outline: 'none',
    },
    searchBtn: {
      padding: '10px 16px', borderRadius: '10px',
      background: 'linear-gradient(135deg,#00f5ff,#00c4cc)',
      border: 'none', color: '#0a0a0f', fontWeight: 700, cursor: 'pointer',
    },
    resultsList: { overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: '10px' },
    resultItem: {
      display: 'flex', gap: '12px', alignItems: 'center',
      padding: '10px', borderRadius: '12px', cursor: 'pointer',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      transition: 'all .2s',
    },
    resultThumb: { width: '80px', height: '50px', borderRadius: '8px', objectFit: 'cover' as const, flexShrink: 0 as const },
    resultInfo: { flex: 1, overflow: 'hidden' },
    resultTitle: {
      fontSize: '0.85rem', color: '#fff', fontWeight: 600,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
    },
    resultChannel: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' },
    toggleSearchBtn: {
      marginTop: '12px', width: '100%', padding: '10px',
      borderRadius: '10px', border: '1px solid rgba(0,245,255,0.3)',
      background: 'rgba(0,245,255,0.08)', color: '#00f5ff',
      cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
    },
    // Interaction overlay
    overlay: {
      position: 'fixed' as const, inset: 0, zIndex: 100,
      background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(15px)',
      display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center' as const, padding: '20px',
    },
    overlayTitle: { fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: '10px' },
    overlayText: { fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '30px', maxWidth: '400px' },
    overlayBtn: {
      padding: '18px 45px', fontSize: '1.2rem', fontWeight: 700,
      background: 'linear-gradient(135deg, #00f5ff 0%, #ff00aa 100%)',
      border: 'none', borderRadius: '50px', color: '#fff',
      cursor: 'pointer', boxShadow: '0 0 40px rgba(0,245,255,0.4)',
    },
  };

  return (
    <>
      {/* Interaction Overlay (to unlock audio) */}
      <AnimatePresence>
        {needsInteraction && (
          <motion.div
            style={s.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎧</div>
              <h2 style={s.overlayTitle}>Ready to Sync?</h2>
              <p style={s.overlayText}>
                {isHost
                  ? "Start your room and invite friends to listen together."
                  : "Join the room to listen to what the host is playing in real-time."}
              </p>
              <motion.button
                style={s.overlayBtn}
                onClick={handleJoinSync}
                whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(0,245,255,0.6)' }}
                whileTap={{ scale: 0.95 }}
              >
                {isHost ? "Launch Room" : "Join Sync"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden YouTube player (audio only via IFrame API) */}
      <div ref={playerContainerRef} style={{ position: 'fixed', bottom: 0, right: 0, width: 0, height: 0, overflow: 'hidden' }}>
        <div id="yt-player" />
      </div>

      {/* 3D background */}
      <div style={s.canvasWrap}>
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#00f5ff" />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00aa" />
          <AudioVisualizer isPlaying={isPlaying} />
          <FloatingOrbs />
        </Canvas>
      </div>

      {/* UI layer */}
      <div style={s.ui}>
        {/* Top bar */}
        <div style={s.topBar}>
          <span style={s.roomCode}>ROOM: {roomCode}</span>
          <span style={s.badge}>{isHost ? '👑 Host' : '🎧 Guest'} · {memberCount} listening</span>
          <button style={s.exitBtn} onClick={handleExit}>← Exit</button>
        </div>

        {/* Body */}
        <div style={s.body}>
          {/* Player card */}
          <motion.div
            style={s.playerCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              style={s.albumArt}
              animate={{ rotate: isPlaying ? 360 : 0, scale: isPlaying ? 1.04 : 1 }}
              transition={{ rotate: { duration: 12, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.3 } }}
            >
              {currentVideo?.thumbnail
                ? <img src={currentVideo.thumbnail} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '🎵'}
            </motion.div>

            <div style={s.trackTitle}>{currentVideo?.title ?? 'No track selected'}</div>
            <div style={s.artist}>{currentVideo?.channel ?? (isHost ? 'Search for a song below ↓' : 'Waiting for host...')}</div>

            <div style={s.controls}>
              <motion.button
                style={s.playBtn}
                onClick={togglePlay}
                whileHover={isHost ? { scale: 1.08 } : {}}
                whileTap={isHost ? { scale: 0.95 } : {}}
              >
                {isPlaying ? '⏸' : '▶'}
              </motion.button>
            </div>

            {!isHost && (
              <p style={s.guestNote}>🔒 Only the host can control playback</p>
            )}

            <div style={s.membersRow}>
              <span>👥</span>
              <span>{memberCount} {memberCount === 1 ? 'person' : 'people'} listening</span>
            </div>

            {/* Host: toggle search */}
            {isHost && (
              <button style={s.toggleSearchBtn} onClick={() => setShowSearch(v => !v)}>
                {showSearch ? '✕ Close Search' : '🔍 Search YouTube'}
              </button>
            )}
          </motion.div>

          {/* Search panel — host only */}
          <AnimatePresence>
            {isHost && showSearch && (
              <motion.div
                style={s.searchPanel}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div style={s.searchTitle}>🎬 Search YouTube</div>

                <form onSubmit={handleSearch} style={s.searchForm}>
                  <input
                    style={s.searchInput}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search songs, artists..."
                  />
                  <button type="submit" style={s.searchBtn} disabled={searching}>
                    {searching ? '...' : '→'}
                  </button>
                </form>

                <div style={s.resultsList}>
                  {searchResults.length === 0 && !searching && (
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center' }}>
                      {searchQuery ? 'No results.' : 'Type to search...'}
                    </p>
                  )}
                  {searchResults.map((v) => (
                    <motion.div
                      key={v.video_id}
                      style={s.resultItem}
                      whileHover={{ background: 'rgba(0,245,255,0.08)', borderColor: 'rgba(0,245,255,0.3)' }}
                      onClick={() => pickVideo(v)}
                    >
                      <img src={v.thumbnail} alt={v.title} style={s.resultThumb} />
                      <div style={s.resultInfo}>
                        <div style={s.resultTitle}>{v.title}</div>
                        <div style={s.resultChannel}>{v.channel}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
