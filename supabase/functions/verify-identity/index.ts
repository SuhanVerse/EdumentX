// ════════════════════════════════════════════════════════════════
// verify-identity
//
// Automated AI image verification pipeline (Phase 3, Advanced
// Architecture — STRICTLY NO VIDEO, static images only).
//
// Triggered by the tutor client after submitting verification
// documents (citizenship/ID) or uploading a profile picture.
// Uses Groq vision for BOTH checks (HuggingFace is unreachable
// from Supabase Edge Runtime due to DNS restrictions):
//
//   1. ID OCR (Groq vision): extracts the name from the ID card
//      image and compares it against the registered profile name.
//   2. Face check (Groq vision): classifies whether the profile
//      picture contains a real human face (rejects cartoons, pets,
//      blank images).
//
// Decision engine:
//   - name match ≥ threshold AND face present AND confidence ≥ 0.9
//       → AUTO-APPROVE: writes directly to Firestore via Admin SDK
//         (tutorVerifications, tutorProfile, tutors discovery doc).
//         Returns { ...verdict, autoApproved: true }.
//   - otherwise → { decision: "manual_review", confidence, reasons }
//         Admin reviews manually in the Verification Queue.
//
// Environment variables:
//   GROQ_API_KEY              — free dev tier, console.groq.com
//   FIREBASE_PRODUCT_ID       — Firebase project id (JWT verification)
//   FIREBASE_SERVICE_ACCOUNT  — JSON service account key (auto-approve)
// ════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { AuthError, verifyFirebaseJwt } from "../_shared/firebase-auth.ts";
import { initializeApp, cert, type App } from "npm:firebase-admin/app";
import { getFirestore } from "npm:firebase-admin/firestore";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Models ────────────────────────────────────────────────────────
// Groq's current free vision model (image-capable chat completions).
const GROQ_VISION_MODEL = "qwen/qwen3.6-27b";
// Name-match confidence threshold (0-1) for the decision engine.
const NAME_MATCH_THRESHOLD = 0.8;
// Confidence threshold for auto-approval (skips admin queue).
const AUTO_APPROVE_THRESHOLD = 0.9;

// ─── Firebase Admin SDK ───────────────────────────────────────────
// Initialized lazily on first invocation that needs Firestore writes.

let firebaseApp: App | null = null;

function getFirebaseAdmin(): App {
  if (firebaseApp) return firebaseApp;
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT not set — cannot auto-approve",
    );
  }
  const serviceAccount = JSON.parse(raw);
  firebaseApp = initializeApp({
    credential: cert(serviceAccount),
  });
  return firebaseApp;
}

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
  /** True when the Edge Function auto-approved the tutor by writing
   *  directly to Firestore via the Admin SDK (bypasses admin queue). */
  autoApproved?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────

function isImageUrl(url: string | undefined): url is string {
  if (!url) return false;
  // Static images only — no video. The mission constraint is strict.
  if (/(\.mp4|\.mov|\.webm|\.mkv|\.avi)(\?|$)/i.test(url)) return false;
  if (/^data:video\//i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

/** Strip <think>...</think> blocks that Qwen 3.6 embeds in responses. */
function stripThinkingTokens(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
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

// ─── 1. ID OCR via Groq vision ─────────────────────────────────────

interface GroqVisionResponse {
  choices?: { message?: { content?: string | null } }[];
}

async function callGroqVision(
  imageUrl: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey()}`,
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      temperature: 0,
      max_tokens: 256,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
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
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
  return stripThinkingTokens(raw);
}

async function extractNameFromId(docUrl: string): Promise<string | null> {
  const result = await callGroqVision(
    docUrl,
    "You are an OCR assistant. Extract the FULL NAME of the document holder from this ID/citizenship card image. Respond with ONLY the name — no explanations, no prefixes, no quotes. If you cannot read a name, respond with exactly UNREADABLE.",
    "Extract the full name from this ID card image.",
  );
  if (!result || result.toUpperCase() === "UNREADABLE") return null;
  return result;
}

// ─── 2. Face check via Groq vision (replaces HuggingFace) ──────────

async function detectFace(photoUrl: string): Promise<{ present: boolean; score: number }> {
  try {
    const result = await callGroqVision(
      photoUrl,
      "You are an image classifier. Your ONLY job is to determine if the image contains a real human face. Do NOT describe the image. Do NOT answer questions about the image. Just classify.",
      'Does this image contain a real human face? Reply with ONLY one word: "yes" or "no". Do not explain.',
    );

    if (!result) return { present: false, score: 0 };

    // The model should reply "yes" or "no" — check for yes/affirmative
    const lower = result.toLowerCase().trim();
    const isYes = lower === "yes" || lower.startsWith("yes") || lower.includes("real human face");
    return { present: isYes, score: isYes ? 0.9 : 0.1 };
  } catch (err) {
    // Fail-open: network errors should not crash the whole pipeline.
    console.error("[verify-identity] face-detection error:", (err as Error).message?.slice(0, 200));
    return { present: false, score: 0 };
  }
}

// ─── 3. Auto-approve via Firebase Admin SDK ────────────────────────
// When the AI confidence is high enough (≥ 0.9), write the approval
// directly to Firestore — bypassing the admin queue entirely. This
// uses the Admin SDK which has unrestricted write access.

async function autoApprove(
  uid: string,
  profileName: string,
  verdict: VerifyIdentityVerdict,
): Promise<boolean> {
  try {
    const app = getFirebaseAdmin();
    const db = getFirestore(app);
    const now = new Date();

    // Use a batch for atomicity — all three writes succeed or none do.
    const batch = db.batch();

    // 1. tutorVerifications/{uid} → status: "approved"
    const verificationRef = db.collection("tutorVerifications").doc(uid);
    batch.set(verificationRef, {
      status: "approved",
      adminNotes: "Auto-approved by AI verification pipeline (confidence ≥ 0.9)",
      reviewedBy: "ai-automation",
      reviewedAt: now,
      updatedAt: now,
    }, { merge: true });

    // 2. users/{uid}/tutorProfile/default → verificationStatus + flags
    const profileRef = db.collection("users").doc(uid)
      .collection("tutorProfile").doc("default");
    batch.set(profileRef, {
      verificationStatus: "approved",
      isVerifiedProfessional: true,
      hasPendingUpdate: false,
      rejectionReason: null,
      aiReview: {
        decision: verdict.decision,
        confidence: verdict.confidence,
        reasons: verdict.reasons,
        checkedAt: verdict.checkedAt,
      },
      updatedAt: now,
    }, { merge: true });

    // 3. tutors/{uid} → student-facing discovery doc
    //    Read the profile first to mirror display fields.
    const profileSnap = await profileRef.get();
    const profileData = profileSnap.data ?? {};

    const tutorRef = db.collection("tutors").doc(uid);
    batch.set(tutorRef, {
      uid,
      fullName: profileData.fullName ?? profileName,
      username: profileData.username ?? null,
      headline: profileData.headline ?? null,
      subjects: profileData.subjects ?? [],
      gradesTeaching: profileData.gradesTeaching ?? [],
      monthlyRateNpr: profileData.monthlyRateNpr ?? 0,
      location: profileData.location ?? null,
      photoUrl: profileData.photoUrl ?? null,
      yearsExperience: profileData.yearsExperience ?? 0,
      bio: profileData.bio ?? "",
      gender: profileData.gender ?? null,
      tutoringMode: profileData.tutoringMode ?? "both",
      languages: profileData.languages ?? ["English", "Nepali"],
      rating: typeof profileData.rating === "number" ? profileData.rating : 0,
      reviewCount: typeof profileData.reviewCount === "number" ? profileData.reviewCount : 0,
      responseRate: typeof profileData.responseRate === "number" ? profileData.responseRate : 0,
      verificationStatus: "approved",
      isVerifiedProfessional: true,
      hasPendingUpdate: false,
      isAvailableForNewStudents: true,
      degree: profileData.degree ?? null,
      institution: profileData.institution ?? null,
      updatedAt: now,
    }, { merge: true });

    await batch.commit();
    console.log(`[verify-identity] ✅ auto-approved ${uid} (confidence=${verdict.confidence})`);
    return true;
  } catch (err) {
    // Auto-approve failure is non-fatal — the tutor stays in manual
    // review queue. Log and return false so the client knows.
    console.error("[verify-identity] auto-approve failed:", (err as Error).message?.slice(0, 300));
    return false;
  }
}

// ─── Handler ───────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const auth = await verifyFirebaseJwt(req);

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

    // 4. Auto-approve when confidence is high enough.
    //    Write directly to Firestore via Admin SDK, bypassing the
    //    admin queue. The human-in-the-loop is the initial policy
    //    decision to set the threshold — once set, high-confidence
    //    passes are fast-tracked automatically.
    if (decision === "approved" && confidence >= AUTO_APPROVE_THRESHOLD) {
      const uid = auth.uid;
      const approved = await autoApprove(uid, profileName ?? "", verdict);
      if (approved) {
        verdict.autoApproved = true;
      }
      // If auto-approve failed, the tutor stays in manual review —
      // the client still persists aiReview and the admin sees the chip.
    }

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
