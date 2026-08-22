/**
 * EdumentX — Automated AI image verification (Phase 3, Advanced
 * Architecture)
 *
 * Client trigger for the `verify-identity` Supabase Edge Function:
 * after a tutor submits verification documents or uploads a profile
 * picture, the app calls the function with the public image URLs and
 * the registered profile name. The function runs:
 *   1. ID OCR (Groq vision) — name on the citizenship/ID card
 *   2. Face-presence check (HuggingFace) — real human face, not a
 *      cartoon / pet / blank image
 * and returns a structured verdict.
 *
 * When confidence ≥ 0.9 (name match + face detected), the Edge Function
 * auto-approves via the Admin SDK — writing to tutorVerifications,
 * tutorProfile, and the tutors discovery doc in one batch. The client
 * receives { autoApproved: true } and routes the tutor directly to the
 * live dashboard, bypassing the admin queue entirely.
 *
 * When confidence < 0.9 or either check fails, the verdict is persisted
 * as `users/{uid}/tutorProfile/default.aiReview` for the admin queue.
 * STRICTLY NO VIDEO — static images only.
 */

import { doc, getFirestore, serverTimestamp, setDoc } from "@react-native-firebase/firestore";
import { getApp } from "@react-native-firebase/app";
import { getAuth, getIdToken } from "@react-native-firebase/auth";

const EDGE_FUNCTION = "verify-identity";

/** Verdict shape mirrored from `supabase/functions/verify-identity`. */
export interface AiReviewVerdict {
  decision: "approved" | "manual_review";
  confidence: number;
  nameMatch: { extracted: string | null; score: number; matched: boolean };
  faceDetected: { present: boolean; score: number };
  reasons: string[];
  checkedAt: string;
  /** When true, the Edge Function auto-approved the tutor by writing
   *  directly to Firestore via the Admin SDK — the client should skip
   *  persistAiReview (already written server-side) and route the tutor
   *  to the live dashboard instead of the pending screen. */
  autoApproved?: boolean;
}

/** Persisted shape on `users/{uid}/tutorProfile/default.aiReview`. */
export interface StoredAiReview {
  decision: "approved" | "manual_review";
  confidence: number;
  reasons: string[];
  checkedAt: string;
}

function edgeFunctionUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  if (url) return `${url.replace(/\/$/, "")}/functions/v1/${EDGE_FUNCTION}`;
  return `https://placeholder.supabase.co/functions/v1/${EDGE_FUNCTION}`;
}

/**
 * Runs the automated verification pipeline against the verify-identity
 * edge function. Returns the verdict, or `null` if the service is
 * unreachable (the account stays queued for manual review — the
 * pipeline is an accelerator, never a hard gate).
 */
export async function runAiVerification(input: {
  docUrl: string | null;
  photoUrl: string | null;
  profileName: string;
}): Promise<AiReviewVerdict | null> {
  const auth = getAuth(getApp());
  const idToken = auth.currentUser
    ? await getIdToken(auth.currentUser)
    : undefined;
  if (!idToken) return null;
  if (!input.docUrl && !input.photoUrl) return null;

  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

  try {
    const res = await fetch(edgeFunctionUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        docUrl: input.docUrl,
        photoUrl: input.photoUrl,
        profileName: input.profileName,
      }),
    });

    if (!res.ok) {
      console.warn(
        "[aiReview] verify-identity failed",
        res.status,
        (await res.text()).slice(0, 200),
      );
      return null;
    }
    const body = (await res.json()) as AiReviewVerdict;
    return body?.decision ? body : null;
  } catch (err) {
    console.warn("[aiReview] verify-identity unreachable", err);
    return null;
  }
}

/**
 * Persists the verdict on the tutor's profile doc so the admin queue
 * can surface it as an AI pre-screen. Best-effort — a failed write
 * leaves the queue with standard (manual) review.
 */
export async function persistAiReview(
  tutorUid: string,
  verdict: AiReviewVerdict,
): Promise<void> {
  const db = getFirestore(getApp());
  const profileRef = doc(db, "users", tutorUid, "tutorProfile", "default");
  const stored: StoredAiReview = {
    decision: verdict.decision,
    confidence: verdict.confidence,
    reasons: verdict.reasons,
    checkedAt: verdict.checkedAt,
  };
  await setDoc(
    profileRef,
    { aiReview: stored, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
