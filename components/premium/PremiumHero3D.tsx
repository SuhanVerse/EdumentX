/**
 * PremiumHero3D — transparent R3F `<Canvas>` wrapper for any 3D scene
 * child. Used by the onboarding carousel to mount `DiscoverScene3D`
 * (slide 1) and `AiOrb3D` (slide 2).
 *
 * Why a wrapper instead of mounting `<Canvas>` inline?
 *
 *   1. Centralizes the lighting rig (ambient + directional) and the
 *      camera baseline — every scene gets the same baseline.
 *   2. `pointerEvents="none"` lets the host screen's Next button
 *      receive taps even though the GL surface covers the slide panel.
 *   3. `<Suspense>` boundary so drei's `<Float>` / `<Sparkles>`
 *      resolve cleanly without crashing the screen.
 *
 * We use `@react-three/fiber/native` (and `@react-three/drei/native`)
 * subpaths — those are the curated RN-safe entrypoints. They avoid
 * pulling in Web-only modules (DOM, document, window) that the
 * default `@react-three/fiber` index references and would crash on
 * the first mount.
 *
 * **Note**: The native `<Canvas>` mounts its own `<GLView>` internally,
 * so we do NOT wrap it in `<GLView>` ourselves — doing so would
 * create two stacked contexts and the inner one would never receive a
 * frame.
 */
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@react-three/fiber/native';

// ─── Props ───────────────────────────────────────────────────────────────────

export type PremiumHero3DProps = {
  children: ReactNode;
  /**
   * Whether taps should fall through to underlying Pressables
   * (Next / Skip). Defaults to `'none'` — the carousel needs the
   * button beneath the GL surface to receive taps.
   */
  pointerEvents?: 'none' | 'auto';
  /**
   * Whether the GL surface should be transparent. Defaults to `true`
   * so the slide's `backgroundColor` shows through the canvas.
   */
  transparent?: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PremiumHero3D({
  children,
  pointerEvents = 'none',
  transparent = true,
}: PremiumHero3DProps) {
  return (
    <View
      pointerEvents={pointerEvents}
      style={StyleSheet.absoluteFill}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 35 }}
        gl={{ alpha: transparent, antialias: true }}
        onCreated={({ gl }) => {
          // The Android emulator's GLES driver returns `undefined`
          // from `gl.getProgramInfoLog()` for some shaders, and
          // three.js 0.171 calls `.trim()` on that result which
          // crashes the render loop. Disabling shader-error
          // checking bypasses the `.trim()` call entirely.
          // Production builds (release/dev-client) are unaffected.
          gl.debug.checkShaderErrors = false;
        }}
      >
        {/* Lighting rig — every scene gets these. Scene-specific
            materials can still add their own emissive properties. */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 4]} intensity={1.2} />

        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </View>
  );
}