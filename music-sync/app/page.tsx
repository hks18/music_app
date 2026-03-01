'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Scene3D from './components/Scene3D';

import { CSSProperties } from 'react';

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
  title: {
    fontSize: 'clamp(3rem, 10vw, 6rem)',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #00f5ff 0%, #ff00aa 50%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '10px',
    textAlign: 'center',
    letterSpacing: '-2px',
  },
  tagline: {
    fontSize: 'clamp(1rem, 3vw, 1.5rem)',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: '60px',
    textAlign: 'center',
  },
  buttonContainer: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    padding: '18px 50px',
    fontSize: '1.1rem',
    fontWeight: 600,
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #00f5ff 0%, #00c4cc 100%)',
    color: '#0a0a0f',
    border: 'none',
    boxShadow: '0 0 30px rgba(0, 245, 255, 0.3)',
  },
  secondaryButton: {
    background: 'transparent',
    color: '#ff00aa',
    border: '2px solid #ff00aa',
    boxShadow: '0 0 20px rgba(255, 0, 170, 0.2)',
  },
  musicNote: {
    fontSize: '4rem',
    marginBottom: '20px',
    display: 'block',
    textAlign: 'center',
  },
};

export default function Home() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <>
      <Scene3D />
      <div style={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.span
            style={styles.musicNote}
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            🎵
          </motion.span>
        </motion.div>
        
        <motion.h1
          style={styles.title}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        >
          SyncBeat
        </motion.h1>
        
        <motion.p
          style={styles.tagline}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
        >
          Listen Together, Feel Together
        </motion.p>
        
        <motion.div
          style={styles.buttonContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
        >
          <motion.button
            style={{
              ...styles.button,
              ...styles.primaryButton,
              transform: hovered === 'join' ? 'scale(1.05)' : 'scale(1)',
              boxShadow: hovered === 'join' 
                ? '0 0 50px rgba(0, 245, 255, 0.5)' 
                : '0 0 30px rgba(0, 245, 255, 0.3)',
            }}
            onMouseEnter={() => setHovered('join')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => router.push('/join')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Join Room
          </motion.button>
          
          <motion.button
            style={{
              ...styles.button,
              ...styles.secondaryButton,
              transform: hovered === 'create' ? 'scale(1.05)' : 'scale(1)',
              boxShadow: hovered === 'create' 
                ? '0 0 40px rgba(255, 0, 170, 0.4)' 
                : '0 0 20px rgba(255, 0, 170, 0.2)',
              background: hovered === 'create' ? 'rgba(255, 0, 170, 0.1)' : 'transparent',
            }}
            onMouseEnter={() => setHovered('create')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => router.push('/create')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Create Room
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}
