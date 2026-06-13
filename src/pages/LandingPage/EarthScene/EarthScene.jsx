import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import styles from './EarthScene.module.scss';
import './EarthScene.css';

// Function to dynamically generate a round circle texture for WebGL points
const createCircleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.7)');
  gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  return new THREE.CanvasTexture(canvas);
};

// Component to render the orbiting elements (atomic style)
const OrbitingElement = ({ radius, angleX, angleZ, speed, label, color }) => {
  const sphereRef = useRef();
  const orbitGroupRef = useRef();

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const currentAngle = elapsed * speed;
    
    // Position of the electron on the circle of radius
    if (sphereRef.current) {
      sphereRef.current.position.x = Math.cos(currentAngle) * radius;
      sphereRef.current.position.z = Math.sin(currentAngle) * radius;
    }
  });

  const orbitGeometry = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  return (
    <group ref={orbitGroupRef} rotation={[angleX, 0, angleZ]}>
      {/* Orbit Line */}
      <lineLoop geometry={orbitGeometry}>
        <lineBasicMaterial color={color} opacity={0.28} transparent />
      </lineLoop>

      {/* Orbiting Node */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={color} />
        
        {/* Floating HTML Label (Name-only, no emojis/values) */}
        <Html distanceFactor={8} zIndexRange={[100, 0]} center>
          <div className={styles.orbitalLabel} style={{ '--accent-color': color }}>
            <span className={styles.orbitalText}>{label}</span>
          </div>
        </Html>
      </mesh>
    </group>
  );
};

// Component for scientific particle bands orbiting the globe
const ParticleBand = ({ count, minRadius, maxRadius, color, size, rotationSpeed, angleX, angleZ, opacity }) => {
  const groupRef = useRef();
  const roundTexture = useMemo(() => createCircleTexture(), []);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + Math.random() * 0.1;
      const r = minRadius + Math.random() * (maxRadius - minRadius);
      const height = (Math.random() - 0.5) * 0.3; // Width of the band

      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(theta) * r;
    }
    return pos;
  }, [count, minRadius, maxRadius]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed;
    }
  });

  if (opacity <= 0.01) return null;

  return (
    <group ref={groupRef} rotation={[angleX, 0, angleZ]}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={size}
          transparent
          opacity={opacity}
          sizeAttenuation={true}
          depthWrite={false}
          alphaTest={0.2}
          blending={THREE.NormalBlending}
          map={roundTexture}
        />
      </points>
    </group>
  );
};

const ScientificParticleBands = ({ scrollProgress }) => {
  // Pollution bands fade out as Earth heals (scrollProgress 0 -> 1)
  const pollutionOpacity = Math.max(0, 0.5 - scrollProgress * 1.2);
  // Clean bands remain or brighten
  const cleanOpacity = Math.min(0.6, 0.3 + scrollProgress * 0.3);

  return (
    <group>
      {/* CO2 Particles Band (Pollution - Red/Orange) */}
      <ParticleBand
        count={250}
        minRadius={1.8}
        maxRadius={2.2}
        color="#c2410c"
        size={0.09}
        rotationSpeed={0.002}
        angleX={Math.PI / 6}
        angleZ={Math.PI / 4}
        opacity={pollutionOpacity}
      />

      {/* PM2.5 Particles Band (Pollution - Amber/Grey) */}
      <ParticleBand
        count={200}
        minRadius={2.2}
        maxRadius={2.6}
        color="#b45309"
        size={0.085}
        rotationSpeed={-0.003}
        angleX={-Math.PI / 4}
        angleZ={Math.PI / 3}
        opacity={pollutionOpacity}
      />

      {/* Air Quality / Eco Particles Band (Clean - Green) */}
      <ParticleBand
        count={350}
        minRadius={2.6}
        maxRadius={3.0}
        color="#166534"
        size={0.09}
        rotationSpeed={0.0015}
        angleX={Math.PI / 3}
        angleZ={-Math.PI / 6}
        opacity={cleanOpacity}
      />

      {/* Oxygen/Eco Particles Band (Clean - Teal/Light Blue) */}
      <ParticleBand
        count={250}
        minRadius={3.0}
        maxRadius={3.4}
        color="#0f766e"
        size={0.085}
        rotationSpeed={-0.001}
        angleX={-Math.PI / 6}
        angleZ={-Math.PI / 4}
        opacity={cleanOpacity}
      />
    </group>
  );
};

// Component for smoke particles around a polluted earth
const PollutionSmoke = ({ scrollProgress }) => {
  const pointsRef = useRef();
  const roundTexture = useMemo(() => createCircleTexture(), []);
  
  const count = 100;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.6 + Math.random() * 0.4;
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.001;
    }
  });

  const opacity = Math.max(0, 0.4 - scrollProgress * 1.5);
  if (opacity <= 0.01) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#857568"
        size={0.12}
        transparent
        opacity={opacity}
        sizeAttenuation={true}
        depthWrite={false}
        alphaTest={0.15}
        blending={THREE.AdditiveBlending}
        map={roundTexture}
      />
    </points>
  );
};

// Component for the Factories and Trees on Earth surface
const SurfaceAssets = ({ scrollProgress }) => {
  const assets = useMemo(() => {
    const list = [];
    const count = 20;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 1.5;
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      const position = new THREE.Vector3(x, y, z);
      const quaternion = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      quaternion.setFromUnitVectors(up, position.clone().normalize());

      list.push({
        position,
        quaternion,
        type: i % 2 === 0 ? 'factory' : 'tree',
      });
    }
    return list;
  }, []);

  const factoryScale = Math.max(0, 1 - scrollProgress * 2.5);
  const treeScale = Math.min(1, Math.max(0, (scrollProgress - 0.2) * 1.25));

  return (
    <group>
      {assets.map((asset, i) => {
        if (asset.type === 'factory') {
          if (factoryScale <= 0.01) return null;
          return (
            <group key={i} position={asset.position} quaternion={asset.quaternion} scale={factoryScale * 0.08}>
              <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.2, 0.3, 1, 8]} />
                <meshStandardMaterial color="#64748b" roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.1, 0]}>
                <boxGeometry args={[0.8, 0.4, 0.8]} />
                <meshStandardMaterial color="#475569" roughness={0.7} />
              </mesh>
            </group>
          );
        } else {
          if (treeScale <= 0.01) return null;
          return (
            <group key={i} position={asset.position} quaternion={asset.quaternion} scale={treeScale * 0.08}>
              <mesh position={[0, 0.7, 0]}>
                <coneGeometry args={[0.4, 0.8, 8]} />
                <meshStandardMaterial color="#16a34a" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
                <meshStandardMaterial color="#78350f" roughness={0.9} />
              </mesh>
            </group>
          );
        }
      })}
    </group>
  );
};

const EarthMesh = ({ scrollProgress }) => {
  const earthRef = useRef();
  const earthTexture = useTexture('/earth_texture.png');

  useFrame((state) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.002;
    }
  });

  const baseDark = { r: 0.14, g: 0.18, b: 0.14 };
  const brightTarget = { r: 0.58, g: 0.92, b: 0.78 };
  const r = baseDark.r + (brightTarget.r - baseDark.r) * scrollProgress;
  const g = baseDark.g + (brightTarget.g - baseDark.g) * scrollProgress;
  const b = baseDark.b + (brightTarget.b - baseDark.b) * scrollProgress;
  const earthColor = new THREE.Color(r, g, b);

  return (
    <group ref={earthRef}>
      {/* Earth Sphere */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          color={earthColor}
          roughness={0.6}
          metalness={0.1}
          bumpMap={earthTexture}
          bumpScale={0.03}
        />
      </mesh>
      
      {/* Surface assets */}
      <SurfaceAssets scrollProgress={scrollProgress} />
    </group>
  );
};

// Component for the revolving ZYGREEN text around the Earth in 3D
const RevolvingBrandText = ({ scrollProgress }) => {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const elapsed = clock.getElapsedTime();
      groupRef.current.rotation.y = elapsed * 0.4; // Rotate text around Y-axis
    }
  });

  // Fade in after scrolling past Section 2 (scrollProgress > 0.5)
  const opacity = Math.min(1, Math.max(0, (scrollProgress - 0.5) * 2.5));
  if (opacity <= 0.01) return null;

  return (
    <group ref={groupRef}>
      {/* Orbiting text node placed at distance of 2.6 */}
      <group position={[0, 0, 2.6]}>
        <Html center distanceFactor={7}>
          <div className={styles.revolvingBrand} style={{ opacity }}>
            <img src="/logo.png" alt="ZyGreen logo" className={styles.revolvingBrandLogo} />
            <span className={styles.revolvingBrandText}>ZyGreen</span>
          </div>
        </Html>
      </group>
    </group>
  );
};

export const EarthSceneInner = ({ scrollProgress, isMobile = false }) => {
  const ambientIntensity = 0.8 + scrollProgress * 1.6;
  const directionalIntensity = 1.4 + scrollProgress * 2.0;
  const pointIntensity = 0.8 + scrollProgress * 1.2;

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[5, 3, 5]} intensity={directionalIntensity} castShadow />
      <pointLight position={[-5, -3, -5]} intensity={pointIntensity} />

      <Suspense fallback={null}>
        <EarthMesh scrollProgress={scrollProgress} />
        <PollutionSmoke scrollProgress={scrollProgress} />
        
        {/* Scientific Orbiting Bands */}
        <ScientificParticleBands scrollProgress={scrollProgress} />

        {/* 4 Electron Orbits (Atomic Model - Name Only, no emojis/values) */}
        <OrbitingElement
          radius={2.4}
          angleX={Math.PI / 6}
          angleZ={Math.PI / 4}
          speed={0.3}
          label="Air"
          color="#22C55E"
        />
        <OrbitingElement
          radius={2.7}
          angleX={-Math.PI / 4}
          angleZ={Math.PI / 3}
          speed={-0.25}
          label="CO₂"
          color="#16a34a"
        />
        <OrbitingElement
          radius={3.0}
          angleX={Math.PI / 3}
          angleZ={-Math.PI / 6}
          speed={0.4}
          label="PM2.5"
          color="#84cc16"
        />
        <OrbitingElement
          radius={3.3}
          angleX={-Math.PI / 6}
          angleZ={-Math.PI / 4}
          speed={-0.15}
          label="TEMP"
          color="#ef4444"
        />

        {/* Revolving brand logo text on scroll */}
        <RevolvingBrandText scrollProgress={scrollProgress} />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        autoRotate={false}
        enablePan={false}
        enableRotate={!isMobile}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} height={300} intensity={0.4} />
      </EffectComposer>
    </>
  );
};

export const EarthCanvas = ({ scrollProgress }) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 768
  );

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className={styles.canvasContainer} style={isMobile ? { pointerEvents: 'none' } : undefined}>
      <Canvas
        camera={{ position: [0, 0, isMobile ? 7.5 : 6.2], fov: isMobile ? 50 : 45 }}
        dpr={[1, isMobile ? 1 : 2]}
        shadows
        style={isMobile ? { touchAction: 'auto' } : undefined}
      >
        <EarthSceneInner scrollProgress={scrollProgress} isMobile={isMobile} />
      </Canvas>
    </div>
  );
};
