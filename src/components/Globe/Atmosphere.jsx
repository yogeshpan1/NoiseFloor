import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const AtmosphereMaterial = shaderMaterial(
  { uColor: new THREE.Color('#f4d03f'), uPower: 2.2, uIntensity: 1.1 },
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  /* glsl */ `
    uniform vec3 uColor;
    uniform float uPower;
    uniform float uIntensity;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float facing = max(dot(vNormal, vViewDir), 0.0);
      float rim = pow(1.0 - facing, uPower);
      gl_FragColor = vec4(uColor * rim * uIntensity, rim);
    }
  `,
);

extend({ AtmosphereMaterial });

// A soft fresnel rim glow: FrontSide so only the fresnel formula's own falloff
// (near-0 at the disc center, near-1 at the grazing-angle silhouette) controls
// opacity — clamping dot() to [0,1] here would collapse every negative dot to a
// solid disc instead of a glow, which is the bug this shape avoids.
export default function Atmosphere({ radius = 1.18 }) {
  return (
    <mesh scale={radius}>
      <sphereGeometry args={[1, 64, 64]} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <atmosphereMaterial
        transparent
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
