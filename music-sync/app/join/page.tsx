'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CSSProperties } from 'react';
import Scene3D from '../components/Scene3D';
import { joinRoom } from '../lib/api';

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
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center' as const,
  },
  title: { fontSize: '2rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' },
  subtitle: { fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginBottom: '30px' },
  input: {
    width: '100%',
    padding: '16px 20px',
    fontSize: '1.5rem',
    fontFamily: "'Outfit', monospace",
    fontWeight: 600,
    letterSpacing: '8px',
    textAlign: 'center' as const,
    background: 'rgba(0,0,0,0.3)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    marginBottom: '20px',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase' as const,
    boxSizing: 'border-box' as const,
  },
  inputFocus: { borderColor: '#00f5ff', boxShadow: '0 0 20px rgba(0,245,255,0.3)' },
  button: {
    width: '100%',
    padding: '16px',
    fontSize: '1.1rem',
    fontWeight: 600,
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #00f5ff 0%, #00c4cc 100%)',
    color: '#0a0a0f',
    border: 'none',
    marginBottom: '20px',
  },
  buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  backLink: { color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', cursor: 'pointer' },
  error: { color: '#ff4444', fontSize: '0.9rem', marginBottom: '15px' },
};

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a 6-character room code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await joinRoom(code);
      // Not host → no sessionStorage flag set
      router.push(`/room/${code.toUpperCase()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
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
          <motion.h1
            style={styles.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Join Room
          </motion.h1>
          <motion.p
            style={styles.subtitle}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Enter the room code to join your friends
          </motion.p>

          <form onSubmit={handleSubmit}>
            <motion.input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().slice(0, 6));
                setError('');
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="XXXXXX"
              style={{ ...styles.input, ...(isFocused ? styles.inputFocus : {}) }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            />

            {error && (
              <motion.p style={styles.error} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              style={{
                ...styles.button,
                ...(code.length !== 6 || loading ? styles.buttonDisabled : {}),
              }}
              disabled={code.length !== 6 || loading}
              whileHover={code.length === 6 && !loading ? { scale: 1.02, boxShadow: '0 0 30px rgba(0,245,255,0.5)' } : {}}
              whileTap={code.length === 6 && !loading ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {loading ? 'Joining...' : 'Enter Room'}
            </motion.button>
          </form>

          <motion.span
            style={styles.backLink}
            onClick={() => router.push('/')}
            whileHover={{ color: '#00f5ff' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            ← Go Back
          </motion.span>
        </motion.div>
      </div>
    </>
  );
}
