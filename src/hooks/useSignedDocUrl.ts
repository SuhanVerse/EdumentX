/**
 * useSignedDocUrl — resolves a SHORT-LIVED signed URL for a private
 * verification doc (citizenship/certificate) through the
 * `verification-doc-url` Edge Function. Replaces the old synchronous
 * public-URL pattern removed by the Aug 24 security fix (the private
 * bucket is no longer publicly readable).
 *
 * Demo videos live in the PUBLIC bucket and keep resolving via
 * `getVerificationDocPublicUrl` — pass them through unchanged.
 */

import { useEffect, useState } from "react";

import {
  getVerificationDocSignedUrl,
  getVerificationDocPublicUrl,
} from "@/services/supabase/storage";

export function useSignedDocUrl(
  path: string | null | undefined,
  cacheBust?: string | number | null,
): { url: string | null; error: Error | null } {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path || path.length === 0) {
      setUrl(null);
      setError(null);
      return;
    }
    // Public-bucket kinds resolve synchronously.
    const publicUrl = getVerificationDocPublicUrl(path);
    if (publicUrl) {
      setUrl(cacheBust ? `${publicUrl}?t=${encodeURIComponent(cacheBust)}` : publicUrl);
      setError(null);
      return;
    }
    let cancelled = false;
    setUrl(null);
    setError(null);
    getVerificationDocSignedUrl(path)
      .then((signed) => {
        if (!cancelled) {
          setUrl(cacheBust ? `${signed}?t=${encodeURIComponent(String(cacheBust))}` : signed);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [path, cacheBust]);

  return { url, error };
}
