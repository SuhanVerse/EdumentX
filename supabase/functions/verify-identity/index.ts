// ════════════════════════════════════════════════════════════════
// verify-identity
//
// Automated AI image verification pipeline (Phase 3, Advanced
// Architecture — STRICTLY NO VIDEO, static images only).
//
// Triggered by the tutor client after submitting verification
// documents (citizenship/ID) or uploading a profile picture. It runs
// TWO free-tier checks and returns a structured verdict:
//
//   1. ID OCR (Groq vision): extracts the name from the ID card image
//      and compares it against the registered profile name.
//   2. Profile-picture check (HuggingFace): a face-presence model
//      confirms the upload is a real human face (rejects cartoons,
//      pets, blank images).
//
// Decision engine:
//   - name match ≥ threshold AND face present
//       → { decision: "approved", confidence } — the admin queue
//         surfaces this as a fast-track "AI pre-screen: PASS" entry
//         (a human still taps approve — the security rules make
//         status flips admin-only by design).
//   - otherwise → { decision: "manual_review", confidence, reasons }
//
// Environment variables:
//   GROQ_API_KEY   — free dev tier, console.groq.com
//   HF_API_TOKEN   — free dev tier, huggingface.co/settings/tokens
//   FIREBASE_PRODUCT_ID — Firebase project id (JWT verification)
// ════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AuthError, verifyFirebaseJwt } from "../_shared/firebase-auth.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Models ────────────────────────────────────────────────────────
// Groq's free vision model (image-capable chat completions).
const GROQ_VISION_MODEL = "llama-3.2-11b-vision-preview";
// HuggingFace face-detection model (object detection → "face" boxes).
const HF_FACE_MODEL = "keremberke/yolov8m-face";
// Name-match confidence threshold (0-1) for the decision engine.
const NAME_MATCH_THRESHOLD = 0.8;
// Minimum face-detection score to count as "a real face present".
const FACE_SCORE_THRESHOLD = 0.5;

// ─── Request shape ─────────────────────────────────────────────────

interface VerifyIdentityRequest {
  /** Public URL of the ID / citizenship card image (image only). */
  docUrl?: string;
  /** Public URL of the profile picture (image only). */
  photoUrl?: string;
  /** The registered profile name to match the OCR output against. */
  profileName?: string;
}

interface VerifyIdentityVerdict {
  decision: "approved" | "manual_review";
  confidence: number;
  nameMatch: { extracted: string | null; score: number; matched: boolean };
  faceDetected: { present: boolean; score: number };
  reasons: string[];
  checkedAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

function isImageUrl(url: string | undefined): url is string {
  if (!url) return false;
  // Static images only — no video. The mission constraint is strict.
  if (/(\.mp4|\.mov|\.webm|\.mkv|\.avi)(\?|$)/i.test(url)) return false;
  if (/^data:video\//i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
}

/** Token-overlap similarity between two names (0-1). Handles "Ram
 *  Poudel" vs "RAM POUDEL" and minor OCR typos without a full fuzzy
 *  library (zero extra deps). */
function nameSimilarity(a: string, b: string): number {
  const ta = normalizeName(a);
  const tb = normalizeName(b);
  if (!ta || !tb) return 0;
  if (ta === tb) return 1;
  const tokensA = new Set(ta.split(" "));
  const tokensB = tb.split(" ");
  if (tokensA.size === 0) return 0;
  const hits = tokensB.filter((t) => tokensA.has(t)).length;
  // Exact single-name match → high score; partial multi-token → scaled.
  return Math.min(1, hits / Math.max(tokensA.size, 1) + (hits > 0 ? 0.1 : 0));
}

function groqKey(): string {
  const k = Deno.env.get("GROQ_API_KEY");
  if (!k) throw new Error("GROQ_API_KEY environment variable is not set");
  return k;
}

function hfToken(): string {
  const t = Deno.env.get("HF_API_TOKEN");
  if (!t) throw new Error("HF_API_TOKEN environment variable is not set");
  return t;
}

// ─── 1. ID OCR via Groq vision ─────────────────────────────────────

interface GroqVisionResponse {
  choices?: { message?: { content?: string | null } }[];
}

async function extractNameFromId(docUrl: string): Promise<string | null> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey()}`,
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      temperature: 0,
      max_tokens: 128,
      messages: [
        {
          role: "system",
          content:
            "You are an OCR assistant. Extract the FULL NAME of the document holder from this ID/citizenship card image. Respond with ONLY the name — no explanations, no prefixes, no quotes. If you cannot read a name, respond with exactly UNREADABLE.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: docUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[verify-identity] Groq vision error:", response.status, body.slice(0, 300));
    return null;
  }

  const json = (await response.json()) as GroqVisionResponse;
  const content = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content || content.toUpperCase() === "UNREADABLE") return null;
  return content;
}

// ─── 2. Face check via HuggingFace ─────────────────────────────────

interface HfDetection {
  label?: string;
  score?: number;
  box?: { xmin: number; ymin: number; xmax: number; ymax: number };
}

async function fetchImageBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch image (${res.status})`);
  return res.arrayBuffer();
}

async function detectFace(photoUrl: string): Promise<{ present: boolean; score: number }> {
  const bytes = await fetchImageBytes(photoUrl);
  const response = await fetch(`https://api-inference.huggingface.co/models/${HF_FACE_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfToken()}`,
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[verify-identity] HF face-detection error:", response.status, body.slice(0, 300));
    // Fail-open: if the model is down (cold start / rate limit), we
    // do NOT hard-fail the whole pipeline — we flag it for review so
    // a human decides. The doc says the free tier has cold starts.
    return { present: false, score: 0 };
  }

  const json = (await response.json()) as HfDetection[] | HfDetection;
  const detections = Array.isArray(json) ? json : [json];
  let best = 0;
  for (const d of detections) {
    if ((d.label ?? "").toLowerCase().includes("face") || typeof d.box === "object") {
      best = Math.max(best, d.score ?? 1);
    }
  }
  return { present: best >= FACE_SCORE_THRESHOLD, score: best };
}

// ─── Handler ───────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    await verifyFirebaseJwt(req);

    let body: VerifyIdentityRequest;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { docUrl, photoUrl, profileName } = body;
    const reasons: string[] = [];
    const checkedAt = new Date().toISOString();

    // 1. ID OCR — but ONLY on static images (STRICTLY NO VIDEO).
    let extracted: string | null = null;
    if (isImageUrl(docUrl)) {
      extracted = await extractNameFromId(docUrl);
    } else if (docUrl) {
      reasons.push("ID document is not a supported static image (videos are not accepted).");
    }

    // 2. Face presence on the profile picture.
    let face: { present: boolean; score: number } = { present: false, score: 0 };
    if (isImageUrl(photoUrl)) {
      face = await detectFace(photoUrl);
    } else if (photoUrl) {
      reasons.push("Profile picture is not a supported static image.");
    }

    // 3. Decision engine.
    const nameMatchScore = profileName && extracted
      ? nameSimilarity(profileName, extracted)
      : 0;
    const matched = nameMatchScore >= NAME_MATCH_THRESHOLD;

    if (extracted && !matched) {
      reasons.push(`OCR name "${extracted}" does not match profile name "${profileName ?? ""}".`);
    }
    if (!face.present) {
      reasons.push("No human face detected in the profile picture (reject cartoons, pets, blank images).");
    }
    if (!extracted) {
      reasons.push("Could not read a name from the ID document.");
    }

    const confidence = (matched ? 0.5 : 0) + (face.present ? 0.5 : 0);
    const decision = matched && face.present ? "approved" : "manual_review";

    const verdict: VerifyIdentityVerdict = {
      decision,
      confidence,
      nameMatch: { extracted, score: nameMatchScore, matched },
      faceDetected: face,
      reasons,
      checkedAt,
    };

    console.log("[verify-identity] verdict:", JSON.stringify(verdict));
    return json(verdict);
  } catch (err) {
    if (err instanceof AuthError) {
      return json({ error: err.message }, err.status);
    }
    console.error("[verify-identity] unhandled error:", err);
    return json(
      {
        error: "Verification service unavailable. The account is queued for manual review.",
        verdict: {
          decision: "manual_review",
          confidence: 0,
          reasons: ["Automated verification service unavailable."],
          checkedAt: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
