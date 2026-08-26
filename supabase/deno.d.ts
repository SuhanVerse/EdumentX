/**
 * Minimal ambient types for the Deno runtime APIs used by the Supabase
 * Edge Functions / AI modules.
 *
 * These files RUN on Deno (deployed to Supabase Edge Runtime) but are
 * EDITED under plain TypeScript via `supabase/tsconfig.json`, which has
 * no Deno lib — so every `Deno.env.get(...)` fails TS2580 "Cannot find
 * name 'Deno'" in the editor.
 *
 * Full fidelity isn't needed: only two APIs are used across the whole
 * supabase/ tree (verified Aug 26): `Deno.env.get` and `Deno.serve`.
 *
 * The root tsconfig excludes `supabase/**` entirely, so these ambient
 * declarations can never leak into the React Native app's typecheck.
 */

declare namespace Deno {
  /** Minimal shape of Deno's environment-variable API. */
  const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    has(key: string): boolean;
    toObject(): Record<string, string>;
  };

  /**
   * Register the fetch handler for an edge function — Supabase's
   * recommended entry point (`Deno.serve(handler)`).
   */
  function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string; onListen?: (params: { hostname: string; port: number }) => void },
  ): void;
}
