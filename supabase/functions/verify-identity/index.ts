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
//       → AUTO-APPROVE: writes directly to Firestore via REST API
//         (tutorVerifications, tutorProfile, tutors discovery doc).
//         Returns { ...verdict, autoApproved: true }.
//   - otherwise → { decision: "manual_review", confidence, reasons }
//         Admin reviews manually in the Verification Queue.
//
// Environment variables:
//   GROQ_API_KEY              — free dev tier, console.groq.com
//   FIREBASE_PRODUCT_ID       — Firebase project id (JWT verification)
//   FIREBASE_SERVICE_ACCOUNT  — JSON service account key (auto-approve)
//
// NOTE: We use the Firestore REST API (HTTP/1.1) instead of the
// Firebase Admin SDK's gRPC because Supabase Edge Runtime (Deno
// Deploy) does not support HTTP/2 gRPC connections to Google APIs.
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
// Groq's current free vision model (image-capable chat completions).
const GROQ_VISION_MODEL = "qwen/qwen3.6-27b";
// Name-match confidence threshold (0-1) for the decision engine.
const NAME_MATCH_THRESHOLD = 0.8;
// Confidence threshold for auto-approval (skips admin queue).
const AUTO_APPROVE_THRESHOLD = 0.9;

// ─── Firestore REST helpers ────────────────────────────────────────
// Supabase Edge Runtime cannot use Firebase Admin SDK's gRPC
// (HTTP/2) connection to Firestore. We use the REST API directly
// via fetch (HTTP/1.1) with OAuth2 service account tokens.

const FIREBASE_PROJECT_ID =
  Deno.env.get("FIREBASE_PRODUCT_ID") ??
  Deno.env.get("FIREBASE_PROJECT_ID") ??
  "";

const FIRESTORE_BASE =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a short-lived OAuth2 access token from the service account.
 * Cached for ~50 min (tokens last 60 min).
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not set");
  const sa = JSON.parse(raw);

  // JWT header
  const header = { alg: "RS256", typ: "JWT" };
  // JWT claim
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const signingInput = `${enc(header)}.${enc(claim)}`;
  // Import the private key for RS256 signing
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) {
    throw new Error(`OAuth2 token error: ${resp.status} ${await resp.text()}`);
  }
  const data = await resp.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000, // refresh 5 min early
  };
  return cachedToken.token;
}

/** Convert PEM private key string to DER ArrayBuffer. */
function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

/**
 * Write a Firestore document via REST API (merge: true = patch).
 */
async function firestoreWrite(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const url = `${FIRESTORE_BASE}/${collection}/${docId}`;
    const fields = dataToFields(data);

    const resp = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields, updateMask: { fieldPaths: Object.keys(fields).join(",") } }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[verify-identity] Firestore write failed (${collection}/${docId}):`, resp.status, errText.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[verify-identity] Firestore write error (${collection}/${docId}):`, (err as Error).message?.slice(0, 200));
    return false;
  }
}

/**
 * Write a Firestore document via REST API (create — fails if exists).
 */
async function firestoreCreate(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const url = `${FIRESTORE_BASE}/${collection}/${docId}`;
    const fields = dataToFields(data);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[verify-identity] Firestore create failed (${collection}/${docId}):`, resp.status, errText.slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[verify-identity] Firestore create error (${collection}/${docId}):`, (err as Error).message?.slice(0, 200));
    return false;
  }
}

/** Read a Firestore document via REST API. Returns null if not found. */
async function firestoreRead(
  collection: string,
  docId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const token = await getAccessToken();
    const url = `${FIRESTORE_BASE}/${collection}/${docId}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const doc = await resp.json();
    return fieldsToData(doc.fields ?? {});
  } catch {
    return null;
  }
}

/** Convert JS values to Firestore REST API field format. */
function dataToFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === "string") {
      fields[k] = { stringValue: v };
    } else if (typeof v === "number") {
      fields[k] = Number.isInteger(v)
        ? { integerValue: String(v) }
        : { doubleValue: v };
    } else if (typeof v === "boolean") {
      fields[k] = { booleanValue: v };
    } else if (Array.isArray(v)) {
      fields[k] = {
        arrayValue: { values: v.map((item) => {
          if (typeof item === "string") return { stringValue: item };
          if (typeof item === "number") return { integerValue: String(item) };
          return { stringValue: String(item) };
        }) },
      };
    } else if (v instanceof Date) {
      fields[k] = { timestampValue: v.toISOString() };
    } else if (typeof v === "object") {
      fields[k] = { mapValue: { fields: dataToFields(v as Record<string, unknown>) } };
    } else {
      fields[k] = { stringValue: String(v) };
    }
  }
  return fields;
}

/** Convert Firestore REST API field format back to JS values. */
function fieldsToData(fields: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields) as [string, Record<string, unknown>][]) {
    if ("stringValue" in v) data[k] = v.stringValue;
    else if ("integerValue" in v) data[k] = Number(v.integerValue);
    else if ("doubleValue" in v) data[k] = v.doubleValue;
    else if ("booleanValue" in v) data[k] = v.booleanValue;
    else if ("nullValue" in v) data[k] = null;
    else if ("arrayValue" in v) data[k] = (v.arrayValue as Record<string, unknown[]>).values?.map((item: Record<string, unknown>) => {
      if ("stringValue" in item) return item.stringValue;
      if ("integerValue" in item) return Number(item.integerValue);
      return String(item);
    }) ?? [];
    else if ("mapValue" in v) data[k] = fieldsToData((v.mapValue as Record<string, Record<string, unknown>>).fields ?? {});
    else if ("timestampValue" in v) data[k] = v.timestampValue;
    else data[k] = String(v);
  }
  return data;
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
  autoApproved?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Check if a URL points to an image. */
function isImageUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|bmp|tiff|heic)(\?.*)?$/i.test(url) ||
    url.includes("supabase.co/storage") ||
    url.includes("firebase") ||
    url.includes("googleapis.com");
}

/** Simple string similarity (Jaccard on character 3-grams). */
function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const na = normalize(a);
  const nb = normalize(b);

  // Exact match after normalization
  if (na === nb) return 1;

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.95;

  // Jaccard on character 3-grams
  const ngrams = (s: string): Set<string> => {
    const grams = new Set<string>();
    for (let i = 0; i <= s.length - 3; i++) {
      grams.add(s.slice(i, i + 3));
    }
    return grams;
  };

  const gramsA = ngrams(na);
  const gramsB = ngrams(nb);
  let intersection = 0;
  for (const g of gramsA) {
    if (gramsB.has(g)) intersection++;
  }
  const union = gramsA.size + gramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ─── 1. ID OCR via Groq Vision ─────────────────────────────────────

async function extractNameFromId(imageUrl: string): Promise<string | null> {
  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      console.warn("[verify-identity] GROQ_API_KEY not set");
      return null;
    }

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the FULL NAME from this ID card or citizenship document. Return ONLY the name, nothing else. No thinking, no explanation.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("[verify-identity] Groq vision error:", resp.status, err.slice(0, 200));
      return null;
    }

    const data = await resp.json();
    let text = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Strip <think>...</think> reasoning blocks from Qwen 3.6
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // If the model still wrapped in quotes, strip them
    text = text.replace(/^["']|["']$/g, "").trim();

    return text || null;
  } catch (err) {
    console.error("[verify-identity] OCR error:", (err as Error).message?.slice(0, 200));
    return null;
  }
}

// ─── 2. Face detection via Groq Vision ─────────────────────────────

async function detectFace(imageUrl: string): Promise<{ present: boolean; score: number }> {
  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) return { present: false, score: 0 };

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Does this image contain a real human face? Reply with ONLY 'yes' or 'no'. No explanation.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!resp.ok) return { present: false, score: 0 };

    const data = await resp.json();
    let result = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Strip <think>...</think> reasoning blocks from Qwen 3.6
    result = result.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

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

// ─── 3. Auto-approve via Firestore REST API ────────────────────────
// When the AI confidence is high enough (≥ 0.9), write the approval
// directly to Firestore — bypassing the admin queue entirely.

async function autoApprove(
  uid: string,
  profileName: string,
  verdict: VerifyIdentityVerdict,
): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    // 1. tutorVerifications/{uid} → status: "approved"
    const v1 = await firestoreWrite("tutorVerifications", uid, {
      status: "approved",
      adminNotes: "Auto-approved by AI verification pipeline (confidence ≥ 0.9)",
      reviewedBy: "ai-automation",
      reviewedAt: now,
      updatedAt: now,
    });

    // 2. Read the existing profile to get display fields
    const profileData = await firestoreRead("users", `${uid}/tutorProfile/default`) ?? {};

    // 3. users/{uid}/tutorProfile/default → verificationStatus + flags
    const v2 = await firestoreWrite("users", `${uid}/tutorProfile/default`, {
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
    });

    // 4. tutors/{uid} → student-facing discovery doc (create or merge)
    const tutorDoc = {
      uid,
      fullName: (profileData.fullName as string) ?? profileName,
      username: (profileData.username as string) ?? null,
      headline: (profileData.headline as string) ?? null,
      subjects: (profileData.subjects as string[]) ?? [],
      gradesTeaching: (profileData.gradesTeaching as string[]) ?? [],
      monthlyRateNpr: (profileData.monthlyRateNpr as number) ?? 0,
      location: (profileData.location as Record<string, unknown>) ?? null,
      photoUrl: (profileData.photoUrl as string) ?? null,
      yearsExperience: (profileData.yearsExperience as number) ?? 0,
      bio: (profileData.bio as string) ?? "",
      gender: (profileData.gender as string) ?? null,
      tutoringMode: (profileData.tutoringMode as string) ?? "both",
      languages: (profileData.languages as string[]) ?? ["English", "Nepali"],
      rating: typeof profileData.rating === "number" ? profileData.rating : 0,
      reviewCount: typeof profileData.reviewCount === "number" ? profileData.reviewCount : 0,
      responseRate: typeof profileData.responseRate === "number" ? profileData.responseRate : 0,
      verificationStatus: "approved",
      isVerifiedProfessional: true,
      hasPendingUpdate: false,
      isAvailableForNewStudents: true,
      degree: (profileData.degree as string) ?? null,
      institution: (profileData.institution as string) ?? null,
      updatedAt: now,
    };
    const v3 = await firestoreWrite("tutors", uid, tutorDoc);

    if (v1 && v2 && v3) {
      console.log(`[verify-identity] ✅ auto-approved ${uid} (confidence=${verdict.confidence})`);
      return true;
    }

    console.error(`[verify-identity] partial auto-approve failure: v1=${v1} v2=${v2} v3=${v3}`);
    return false;
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
    //    Write directly to Firestore via REST API, bypassing the
    //    admin queue.
    if (decision === "approved" && confidence >= AUTO_APPROVE_THRESHOLD) {
      const uid = auth.uid;
      const approved = await autoApprove(uid, profileName ?? "", verdict);
      if (approved) {
        verdict.autoApproved = true;
      }
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
