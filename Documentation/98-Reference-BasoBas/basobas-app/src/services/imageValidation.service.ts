// ═══════════════════════════════════════════════════════════════════════════
// imageValidation.service — client-side AI content gate.
//
// Runs at pick time (BEFORE upload) so users get instant feedback and
// rejected images never consume storage/bandwidth. Compresses the picked
// image to a ~512px JPEG (~60KB) and asks the validate-image Edge Function
// whether it suits the context (avatar = human face, property = residence).
//
// Failure semantics: any transport/edge error DEGRADES to pass — an AI
// outage must never block a user from signing up or listing. Only an
// explicit { valid: false } verdict from a provider blocks the image.
//
// KYC documents are deliberately excluded: free-tier providers may log
// request payloads, so sensitive ID documents never go through here.
// ═══════════════════════════════════════════════════════════════════════════

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ok, getErrorMessage, type Result } from '@/src/lib/result';
import type { Database } from '@/src/types/database.types';

export type AiValidationContext = 'avatar' | 'property';

/** Longest edge sent to the model — plenty for classification, tiny payload. */
const ANALYSIS_WIDTH = 512;
const JPEG_QUALITY = 0.7;

interface ValidateImageResponse {
  valid?: boolean;
  reason?: string;
  degraded?: boolean;
  provider?: string;
}

export interface ContentVerdict {
  valid: boolean;
  /** Human-friendly rejection reason (present when valid === false). */
  reason?: string;
}

/**
 * Downscale + compress + base64-encode a local image URI for analysis.
 * Throws if manipulation fails — callers degrade to pass on throw.
 */
async function toAnalysisBase64(localUri: string): Promise<{
  base64: string;
  mimeType: 'image/jpeg';
}> {
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: ANALYSIS_WIDTH } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { base64, mimeType: 'image/jpeg' };
}

/**
 * Ask the backend whether this image's CONTENT fits the context.
 *
 * Always resolves ok(...) — rejections are a domain outcome, not an error:
 *   - { valid: false, reason } → show reason, block the image
 *   - { valid: true }          → proceed (including degraded passes)
 */
export async function validateImageContent(
  localUri: string,
  context: AiValidationContext,
  supabase: SupabaseClient<Database>,
): Promise<Result<ContentVerdict>> {
  try {
    const { base64, mimeType } = await toAnalysisBase64(localUri);

    const { data, error } = await supabase.functions.invoke('validate-image', {
      body: { imageBase64: base64, mimeType, context },
    });

    if (error) {
      // Function unreachable / threw / non-2xx → fail-open, but make it visible.
      console.warn(
        '[validateImageContent] DEGRADED pass — edge function unavailable:',
        error.message,
      );
      return ok({ valid: true });
    }

    const response = (data ?? {}) as ValidateImageResponse;

    if (
      typeof response.valid !== 'boolean' ||
      response.degraded === true ||
      response.provider === 'none'
    ) {
      // Malformed or degraded response → fail-open, but make it visible.
      console.warn(
        '[validateImageContent] DEGRADED pass — AI gate unavailable:',
        JSON.stringify(response),
      );
      return ok({ valid: true });
    }

    if (!response.valid) {
      return ok({
        valid: false,
        reason:
          response.reason ??
          (context === 'avatar'
            ? 'Please use a photo that clearly shows your face.'
            : 'Please use a photo showing the property.'),
      });
    }

    return ok({ valid: true });
  } catch (e) {
    // Local compression/read failure → fail-open; bucket caps still apply.
    console.warn(
      '[validateImageContent] DEGRADED pass — local processing failed:',
      getErrorMessage(e),
    );
    return ok({ valid: true });
  }
}
