import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import * as THREE from 'three';
import Globe3D from './Globe3D';
import Atmosphere from './Atmosphere';
import NepalMarker from './NepalMarker';
import Starfield from './Starfield';
import { useStore } from '../../store/useStore';
import { latLonToVector3, NEPAL_COORDS } from '../../utils/helpers';

// Face India/China/Nepal from the very first frame instead of the Americas —
// the whole point of the globe is to draw the eye to this region, so auto-rotate
// or a manual drag shouldn't be required just to see it.
const INITIAL_CAMERA_POSITION = latLonToVector3(NEPAL_COORDS.lat, NEPAL_COORDS.lon, 3).toArray();

function CameraRig({ entering, onArrive }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!entering) return undefined;

    // Great-circle (quaternion-slerp) flight, not a straight-line position tween:
    // a naive lerp between the start and end positions can cut a chord straight
    // through the globe's interior when the two points are far apart in angle.
    // Slerping the *direction* and lerping the *distance* separately guarantees
    // camera.position always stays exactly `distance` from the origin, so it can
    // never dip inside the sphere.
    const startDir = camera.position.clone().normalize();
    const startDist = camera.position.length();
    const endDir = latLonToVector3(NEPAL_COORDS.lat, NEPAL_COORDS.lon, 1).normalize();
    const endDist = 2.2;
    const up = new THREE.Vector3(0, 0, 1);
    const qStart = new THREE.Quaternion().setFromUnitVectors(up, startDir);
    const qEnd = new THREE.Quaternion().setFromUnitVectors(up, endDir);

    const proxy = { t: 0 };
    const tween = gsap.to(proxy, {
      t: 1,
      duration: 2.2,
      ease: 'power3.inOut',
      onUpdate: () => {
        const q = qStart.clone().slerp(qEnd, proxy.t);
        const dir = up.clone().applyQuaternion(q);
        const dist = THREE.MathUtils.lerp(startDist, endDist, proxy.t);
        camera.position.copy(dir.multiplyScalar(dist));
        camera.lookAt(0, 0, 0);
      },
      onComplete: onArrive,
    });
    return () => tween.kill();
  }, [entering, camera, onArrive]);

  return (
    <OrbitControls
      enabled={!entering}
      autoRotate
      autoRotateSpeed={0.45}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.6}
      maxDistance={4}
      rotateSpeed={0.6}
      zoomSpeed={0.7}
    />
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 2, 4]} intensity={1.4} color="#fff6e0" />
      <directionalLight position={[-4, -2, -3]} intensity={0.3} color="#4060a0" />
    </>
  );
}

export default function GlobeScene() {
  const [entering, setEntering] = useState(false);
  const setAppPhase = useStore((s) => s.setAppPhase);
  const setGlobeTransitioning = useStore((s) => s.setGlobeTransitioning);

  const handleEnter = () => {
    setEntering(true);
    setGlobeTransitioning(true);
  };

  const handleArrive = () => {
    setAppPhase('dashboard');
  };

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center bg-bg-primary">
      <div className="absolute inset-0 will-change-transform">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: INITIAL_CAMERA_POSITION, fov: 45 }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <SceneLighting />
            <Starfield />
            <Globe3D />
            <Atmosphere />
            <NepalMarker />
            <CameraRig entering={entering} onArrive={handleArrive} />
          </Suspense>
        </Canvas>
      </div>

      {!entering && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="absolute bottom-16 z-10 flex flex-col items-center gap-4 px-4 text-center"
        >
          <p className="max-w-md font-serif text-lg italic text-text-secondary">
            96 countries watched. Two told very different stories.
          </p>
          <motion.button
            type="button"
            onClick={handleEnter}
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(244,208,63,0.6)' }}
            whileTap={{ scale: 0.97 }}
            animate={{ boxShadow: ['0 0 12px rgba(212,175,55,0.35)', '0 0 28px rgba(212,175,55,0.6)', '0 0 12px rgba(212,175,55,0.35)'] }}
            transition={{ boxShadow: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }}
            className="min-h-[44px] rounded-full bg-gold-gradient px-10 py-4 font-sans text-sm font-bold uppercase tracking-[0.25em] text-bg-primary"
          >
            Enter Noise Floor
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
