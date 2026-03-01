'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars, Torus, Icosahedron, Octahedron } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function FloatingShape({ position, rotation, color, geometry }: { position: [number, number, number], rotation?: [number, number, number], color: string, geometry: 'torus' | 'icosahedron' | 'octahedron' }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.002;
      meshRef.current.rotation.y += 0.003;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} position={position} rotation={rotation}>
        {geometry === 'torus' ? (
          <torusGeometry args={[1, 0.3, 16, 100]} />
        ) : geometry === 'icosahedron' ? (
          <icosahedronGeometry args={[1, 0]} />
        ) : (
          <octahedronGeometry args={[1, 0]} />
        )}
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.6}
          wireframe
        />
      </mesh>
    </Float>
  );
}

function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleCount = 500;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return pos;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial size={0.05} color="#00f5ff" transparent opacity={0.8} />
    </points>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00f5ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00aa" />
      
      <Particles />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      
      <FloatingShape position={[-4, 2, -5]} color="#00f5ff" geometry="icosahedron" />
      <FloatingShape position={[4, -2, -3]} color="#ff00aa" geometry="torus" />
      <FloatingShape position={[0, 3, -7]} color="#8b5cf6" geometry="octahedron" />
      <FloatingShape position={[-3, -3, -4]} color="#00f5ff" geometry="torus" />
      <FloatingShape position={[5, 1, -6]} color="#ff00aa" geometry="icosahedron" />
      <FloatingShape position={[-2, 4, -8]} color="#8b5cf6" geometry="octahedron" />
    </>
  );
}

export default function Scene3D() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <Scene />
      </Canvas>
    </div>
  );
}
