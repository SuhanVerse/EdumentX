// ═══════════════════════════════════════════════════════════════════════════
// imageValidation — instant, offline technical checks for picked media.
//
// Runs synchronously against the `ImagePickerAsset` metadata the picker
// already returns (fileSize / width / height / mimeType), so a bad pick is
// rejected in <10ms — before any network call, upload, or AI gate runs.
//
// This layer catches garbage files (PDF renamed .jpg, 50MB photos, tiny
// thumbnails). Content correctness ("is this actually a person's face?")
// is handled separately by the AI gate in src/services/imageValidation.service.
//
// Server-side backstop: the Supabase buckets mirror these caps via
// allowed_mime_types + file_size_limit (see supabase/bucket-hardening.sql).
// ═══════════════════════════════════════════════════════════════════════════

import type { ImagePickerAsset } from 'expo-image-picker';

export type MediaValidationContext =
  | 'avatar'
  | 'property'
  | 'kyc_document'
  | 'video';

export type MediaValidationResult =
  | { ok: true }
  | { ok: false; message: string };

interface ContextRules {
  /** Human-facing name used in error copy, e.g. "Profile photo is too large." */
  label: string;
  maxBytes: number;
  minWidth: number;
  minHeight: number;
  allowedMimeTypes: readonly string[];
  /** Whether width/height are meaningful for this context (videos aren't checked). */
  checkDimensions: boolean;
}

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/** KYC docs are sensitive PII — restrict to formats we control end-to-end. */
const DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

function mb(bytes: number): number {
  return bytes * 1024 * 1024;
}

const RULES: Record<MediaValidationContext, ContextRules> = {
  avatar: {
    label: 'Profile photo',
    maxBytes: mb(2),
    minWidth: 300,
    minHeight: 300,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    checkDimensions: true,
  },
  property: {
    label: 'Property photo',
    maxBytes: mb(8),
    minWidth: 500,
    minHeight: 500,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    checkDimensions: true,
  },
  kyc_document: {
    label: 'Document photo',
    maxBytes: mb(5),
    minWidth: 400,
    minHeight: 400,
    allowedMimeTypes: DOCUMENT_MIME_TYPES,
    checkDimensions: true,
  },
  video: {
    label: 'Video',
    // Mirrors KYC_VIDEO_MAX_BYTES in storage.service.ts and the bucket cap.
    maxBytes: mb(100),
    minWidth: 0,
    minHeight: 0,
    allowedMimeTypes: VIDEO_MIME_TYPES,
    checkDimensions: false,
  },
};

/**
 * Validate one picked asset against the rules for `context`.
 *
 * Missing metadata (fileSize/mimeType are `null` on some Web/Android
 * content-provider URIs) is treated as pass — the Supabase bucket caps are
 * the hard backstop for anything that slips through locally.
 */
export function validateImageAsset(
  asset: Pick<
    ImagePickerAsset,
    'mimeType' | 'fileSize' | 'width' | 'height' | 'uri'
  >,
  context: MediaValidationContext,
): MediaValidationResult {
  const rules = RULES[context];

  if (asset.fileSize != null && asset.fileSize > rules.maxBytes) {
    const maxMb = Math.round(rules.maxBytes / (1024 * 1024));
    return {
      ok: false,
      message: `${rules.label} is too large — please choose one under ${maxMb}MB.`,
    };
  }

  if (
    rules.checkDimensions &&
    asset.width > 0 &&
    asset.height > 0 &&
    (asset.width < rules.minWidth || asset.height < rules.minHeight)
  ) {
    return {
      ok: false,
      message: `${rules.label} is too small — minimum ${rules.minWidth}×${rules.minHeight}px.`,
    };
  }

  if (
    asset.mimeType &&
    !rules.allowedMimeTypes.includes(asset.mimeType.toLowerCase())
  ) {
    const accepted =
      context === 'video'
        ? 'MP4, MOV or WebM'
        : context === 'kyc_document'
          ? 'JPG or PNG'
          : 'JPG, PNG, WebP or HEIC';
    return {
      ok: false,
      message: `${rules.label} format isn't supported — please use ${accepted}.`,
    };
  }

  return { ok: true };
}
