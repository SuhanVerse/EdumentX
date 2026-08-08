/**
 * AiOrb3D — onboarding slide 2 of 3.
 *
 * 3D translation of `AiMatchIllustration.tsx`. UX intent preserved:
 *   an indigo orb with a soft white highlight, drifting amber
 *   sparkles around it.
 *
 * Implementation:
 *   - Drei `<Float>` wraps the orb with a gentle vertical bob +
 *     subtle tilt rotation. `speed={1.2}` reads as alive but not
 *     frantic.
 *   - A larger indigo sphere with emissive indigo-dark material
 *     forms the orb. An off-centre smaller white sphere at opacity
 *     0.35 sits as the highlight.
 *   - Drei `<Sparkles>` emits 20 amber particles in a 2-unit cube
 *     around the orb, scaled small enough to read as ambient dust.
 *
 * Colors come from `constants/colors.ts` (R3F primitives need raw
 * hex; Tailwind classes don't reach them).
 */
import { Float, Sparkles } from '@react-three/drei/native';

import { colors } from '@/constants/colors';

// ─── Component ───────────────────────────────────────────────────────────────

export function AiOrb3D() {
  return (
    <group>
      <Float
        speed={1.2}
        rotationIntensity={0.4}
        floatIntensity={0.6}
      >
        {/* Central indigo orb */}
        <mesh>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial
            color={colors.brand.ai}
            emissive={colors.brand.aiDark}
            emissiveIntensity={0.45}
            roughness={0.25}
            metalness={0.3}
          />
        </mesh>

        {/* Off-centre soft highlight — small white sphere */}
        <mesh position={[-0.3, 0.3, 0.5]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial
            color={colors.background.surface}
            transparent
            opacity={0.35}
            roughness={0.1}
            metalness={0.05}
          />
        </mesh>
      </Float>

      {/* Amber sparkle dust around the orb */}
      <Sparkles
        count={20}
        scale={[2.2, 2.2, 2.2]}
        size={2}
        speed={0.4}
        color={colors.brand.accent}
      />
    </group>
  );
}