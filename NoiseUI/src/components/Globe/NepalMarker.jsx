import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { latLonToVector3, NEPAL_COORDS } from '../../utils/helpers';

export default function NepalMarker() {
  const groupRef = useRef(null);
  const ringRef = useRef(null);
  const position = latLonToVector3(NEPAL_COORDS.lat, NEPAL_COORDS.lon, 1.01);
  const normal = position.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2.2) * 0.25;
    if (groupRef.current) groupRef.current.scale.setScalar(pulse);
    if (ringRef.current) {
      const ringPulse = (t * 0.6) % 1;
      ringRef.current.scale.setScalar(1 + ringPulse * 2.2);
      ringRef.current.material.opacity = Math.max(0, 0.6 - ringPulse * 0.6);
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.008, 16, 16]} />
          <meshStandardMaterial
            color="#f4d03f"
            emissive="#f4d03f"
            emissiveIntensity={2.2}
            toneMapped={false}
          />
        </mesh>
      </group>
      <mesh ref={ringRef} quaternion={quaternion}>
        <ringGeometry args={[0.009, 0.012, 32]} />
        <meshBasicMaterial color="#f4d03f" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#f4d03f" intensity={0.35} distance={0.3} />
    </group>
  );
}
