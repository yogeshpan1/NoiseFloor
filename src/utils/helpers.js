import * as THREE from 'three';

export const NEPAL_COORDS = { lat: 28.3949, lon: 84.124 };

/** Convert lat/lon (degrees) to a Vector3 on a sphere of the given radius. */
export function latLonToVector3(lat, lon, radius = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

/** Shared cinematic easing, matches the design spec's cubic-bezier(0.4, 0, 0.2, 1). */
export const CINEMATIC_EASE = [0.4, 0, 0.2, 1];

export const fadeInUp = {
  hidden: { opacity: 0, y: 48, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: CINEMATIC_EASE } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

/** For section headings: a larger, slower entrance so the "beat" of a new
 * section reads clearly as you scroll into it. */
export const headingReveal = {
  hidden: { opacity: 0, y: 64 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: CINEMATIC_EASE } },
};

/** For stat tiles / chart panels: fade + scale up from slightly small. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: CINEMATIC_EASE } },
};

export function formatTone(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
