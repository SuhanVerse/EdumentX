// ═══════════════════════════════════════════════════════════════════════════
// demoMode — dev/demo-only escape hatches.
//
// Enable by setting EXPO_PUBLIC_DEMO_MODE=1 in .env (or app config extra)
// before starting Metro. Production builds never set it, so every gate
// below compiles to `false` and the UI affordances don't render.
//
// Currently gates:
//   • Long-press "fast-forward" on visit cards — force-marks an accepted
//     visit past its window so the post-visit follow-up flow can be
//     demoed without waiting for real time to pass.
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === '1';
