/**
 * DiscoverScene3D — onboarding slide 1 of 3.
 *
 * 3D translation of `DiscoverIllustration.tsx`. UX intent preserved:
 *   a sand-coloured map + 3 tutor pins + a pulsing amber current-
 *   location beacon in the centre.
 *
 * Implementation:
 *   - 3×3 plane tiles (`meshStandardMaterial`) form the sand grid.
 *   - 3 cone "pins" (rotated so the apex points up) sit on top of the
 *     tiles at three asymmetric positions.
 *   - An emissive amber sphere at the origin pulses scale via
 *     `useFrame` + `Math.sin`.
 *   - The whole group rotates slowly on the Y axis so the scene has
 *     subtle parallax as the user looks at it.
 *
 * Colors are read from `constants/colors.ts` (R3F primitives need raw
 * hex strings; Tailwind classes don't reach them).
 */
import { useFrame } from '@react-three/fiber/native';
import { useMemo, useRef } from 'react';
import { Group } from 'three';

import { colors } from '@/constants/colors';

// ─── Geometry constants ──────────────────────────────────────────────────────

const TILE_SIZE = 0.6;
const TILE_GAP = 0.1;
const TILE_INSET = -((TILE_SIZE + TILE_GAP) * 1.5) + (TILE_SIZE + TILE_GAP) / 2;

const PINS: readonly { x: number; z: number }[] = [
  { x: 0.8, z: 0.5 }, // top-right
  { x: -0.9, z: -0.2 }, // mid-left
  { x: 0.6, z: -0.9 }, // bottom-right
];

// ─── Component ───────────────────────────────────────────────────────────────

export function DiscoverScene3D() {
  const group = useRef<Group>(null);
  const beacon = useRef<Group>(null);

  // Pre-compute tile offsets so `useFrame` doesn't allocate per frame.
  const tileOffsets = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return {
          x: TILE_INSET + col * (TILE_SIZE + TILE_GAP),
          z: TILE_INSET + row * (TILE_SIZE + TILE_GAP),
        };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      // Slow continuous Y-axis rotation — 0.18 rad/s reads as a lazy
      // tabletop-spin. Combined with the static camera, this gives
      // the "examining a 3D model" feel.
      group.current.rotation.y = t * 0.18;
    }
    if (beacon.current) {
      // Pulse scale 1.0 -> 1.15 -> 1.0 every ~3.14 s (sin(t*2)).
      const s = 1 + Math.sin(t * 2) * 0.15;
      beacon.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={group}>
      {/* Sand tile grid — 3×3 */}
      {tileOffsets.map((offset, i) => (
        <mesh
          key={`tile-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[offset.x, 0, offset.z]}
        >
          <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
          <meshStandardMaterial
            color={colors.background.page}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>
      ))}

      {/* Tutor pins — three cone markers, apex pointing up */}
      {PINS.map((pin, i) => (
        <mesh
          key={`pin-${i}`}
          position={[pin.x, 0.35, pin.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {/* Cone with radius 0.12, height 0.4. Apex points along
              the local +Z axis; rotating -90° on X lifts it upright. */}
          <coneGeometry args={[0.12, 0.4, 16]} />
          <meshStandardMaterial
            color={colors.brand.primary}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Amber current-location beacon — pulses scale */}
      <group ref={beacon} position={[0, 0.25, 0]}>
        <mesh>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshStandardMaterial
            color={colors.brand.accent}
            emissive={colors.brand.accent}
            emissiveIntensity={0.6}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
      </group>
    </group>
  );
}