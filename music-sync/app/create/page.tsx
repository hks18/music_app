'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CSSProperties } from 'react';
import Scene3D from '../components/Scene3D';
import { createRoom } from '../lib/api';

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
    padding: '20px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center' as const,
  },
  title: { fontSize: '2rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' },
  subtitle: { fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '30px' },
  codeContainer: {
    background: 'rgba(0,0,0,0.4)',
    border: '2px solid rgba(0,245,255,0.3)',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '20px',
  },
  codeLabel: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
  },
  code: {
    fontSize: '2.5rem',
    fontFamily: "'Outfit', monospace",
    fontWeight: 700,
    color: '#00f5ff',
    letterSpacing: '8px',
    marginBottom: '15px',
  },
  copyRow: { display: 'flex', gap: '10px', justifyContent: 'center' },
  copyButton: {
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontWeight: 500,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  shareSection: { marginTop: '20px' },
  shareLabel: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
  },
  shareLink: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.7)',
    background: 'rgba(0,0,0,0.3)',
    padding: '12px 16px',
    borderRadius: '8px',
    wordBreak: 'break-all' as const,
    marginBottom: '10px',
  },
  button: {
    width: '100%',
    padding: '16px',
    fontSize: '1.1rem',
    fontWeight: 600,
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #ff00aa 0%, #cc0088 100%)',
    color: '#ffffff',
    border: 'none',
    marginTop: '20px',
    marginBottom: '15px',
  },
  backLink: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'color 0.3s ease',
  },
  loading: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '1rem',
    marginTop: '10px',
  },
  error: { color: '#ff4444', fontSize: '0.9rem', marginTop: '10px' },
};

export default function CreatePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Call real backend to create room
    createRoom()
      .then((data) => {
        setRoomCode(data.room.code);
        localStorage.setItem(`host_${data.room.code}`, 'true');
        if (data.host_session_key) {
          localStorage.setItem(`host_key_${data.room.code}`, data.host_session_key);
        }
      })
      .catch(() => setError('Could not connect to server. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareLink(`${window.location.origin}/room/${roomCode}`);
    }
  }, [roomCode]);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <>
      <Scene3D />
      <div style={styles.container}>
        <motion.div
          style={styles.card}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <span style={{ fontSize: '3rem' }}>{loading ? '⏳' : error ? '❌' : '🎉'}</span>
          </motion.div>

          <motion.h1
            style={styles.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {loading ? 'Creating Room...' : error ? 'Error' : 'Room Created!'}
          </motion.h1>

          {loading && <p style={styles.loading}>Connecting to server...</p>}
          {error && <p style={styles.error}>{error}</p>}

          {!loading && !error && (
            <>
              <motion.p
                style={styles.subtitle}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Share this code with your friends
              </motion.p>

              <motion.div
                style={styles.codeContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div style={styles.codeLabel}>Room Code</div>
                <div style={styles.code}>{roomCode}</div>
                <div style={styles.copyRow}>
                  <motion.button
                    style={styles.copyButton}
                    onClick={() => copyToClipboard(roomCode, 'code')}
                    whileHover={{ background: 'rgba(0,245,255,0.2)', borderColor: '#00f5ff' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {copied ? '✓ Copied!' : '📋 Copy Code'}
                  </motion.button>
                </div>
              </motion.div>

              <motion.div
                style={styles.shareSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div style={styles.shareLabel}>Or Share Link</div>
                <div style={styles.shareLink}>{shareLink}</div>
                <motion.button
                  style={styles.copyButton}
                  onClick={() => copyToClipboard(shareLink, 'link')}
                  whileHover={{ background: 'rgba(139,92,246,0.2)', borderColor: '#8b5cf6' }}
                  whileTap={{ scale: 0.95 }}
                >
                  {linkCopied ? '✓ Link Copied!' : '🔗 Copy Link'}
                </motion.button>
              </motion.div>

              <motion.button
                style={styles.button}
                onClick={() => router.push(`/room/${roomCode}`)}
                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(255,0,170,0.5)' }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                Enter Room
              </motion.button>
            </>
          )}

          <motion.span
            style={styles.backLink}
            onClick={() => router.push('/')}
            whileHover={{ color: '#00f5ff' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            ← Go Back
          </motion.span>
        </motion.div>
      </div>
    </>
  );
}
