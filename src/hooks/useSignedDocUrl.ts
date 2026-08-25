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

/**
 * Append a cache-bust param WITHOUT breaking URLs that already carry a
 * query string. Signed URLs look like `…?token=eyJ…` — appending `?t=`
 * after that corrupts the token param and the storage gateway rejects
 * the whole URL (the "documents don't render" bug). Signed URLs are
 * unique per mint anyway, so busting is a no-op for them; public URLs
 * (avatars, demo videos) are the ones that actually need it.
 */
function bust(url: string, cacheBust: string | number | null | undefined): string {
  if (!cacheBust) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${encodeURIComponent(String(cacheBust))}`;
}

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
      setUrl(bust(publicUrl, cacheBust));
      setError(null);
      return;
    }
    let cancelled = false;
    setUrl(null);
    setError(null);
    getVerificationDocSignedUrl(path)
      .then((signed) => {
        if (!cancelled) {
          setUrl(bust(signed, cacheBust));
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
