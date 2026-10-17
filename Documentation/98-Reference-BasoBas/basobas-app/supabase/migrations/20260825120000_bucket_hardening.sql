-- ═══════════════════════════════════════════════════════════════════
-- Bucket hardening — server-side backstop for upload validation.
--
-- Mirrors the client-side caps in src/lib/imageValidation.ts so even a
-- bypassed client cannot abuse storage with garbage files.
--
-- Client-side rules (imageValidation.ts):
--   avatars          ≤ 2MB   jpg/png/webp/heic/heif   (min 300×300, AI-gated)
--   property-photos  ≤ 8MB   jpg/png/webp/heic/heif   (min 500×500, AI-gated)
--   kyc-documents    ≤ 5MB   jpg/png only             (NO AI gate — PII)
--   kyc-videos       ≤ 100MB mp4/mov/webm
--
-- Note: Supabase Storage applies allowed_mime_types/file_size_limit at
-- upload time. Existing objects are unaffected; only new uploads are
-- checked. HEIC/HEIF is allowed on avatars/property because iOS camera
-- picks may arrive as HEIC before the app re-encodes to JPEG.
-- ═══════════════════════════════════════════════════════════════════

update storage.buckets
set file_size_limit = 2097152, -- 2MB
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]
where id = 'avatars';

update storage.buckets
set file_size_limit = 8388608, -- 8MB
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]
where id = 'property-photos';

update storage.buckets
set file_size_limit = 5242880, -- 5MB
    allowed_mime_types = array[
      'image/jpeg',
      'image/png'
    ]
where id = 'kyc-documents';

update storage.buckets
set file_size_limit = 104857600, -- 100MB
    allowed_mime_types = array[
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ]
where id = 'kyc-videos';
