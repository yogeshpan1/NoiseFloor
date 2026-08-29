import { forwardRef } from 'react';
import { useTexture } from '@react-three/drei';
import earthTexture from '../../assets/textures/earth-gold-equirect.png';

const Globe3D = forwardRef(function Globe3D(props, ref) {
  const texture = useTexture(earthTexture);

  return (
    <mesh ref={ref} {...props}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial map={texture} metalness={0.35} roughness={0.55} />
    </mesh>
  );
});

export default Globe3D;
