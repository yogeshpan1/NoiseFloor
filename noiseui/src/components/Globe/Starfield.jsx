import { Stars } from '@react-three/drei';
import { useStore } from '../../store/useStore';

export default function Starfield() {
  const breakpoint = useStore((s) => s.breakpoint);
  const count = breakpoint === 'mobile' ? 2500 : 6000;

  return (
    <Stars radius={80} depth={40} count={count} factor={3} saturation={0} fade speed={0.4} />
  );
}
