/**
 * EdumentX — Server-side Firestore writes from Supabase Edge
 * Functions (REST + service-account OAuth2).
 *
 * Supabase Edge Runtime cannot use the Firebase Admin SDK's gRPC
 * (HTTP/2) transport, so privileged writes go through the Firestore
 * REST API with a service-account bearer token (datastore scope).
 *
 * WHY THIS EXISTS (Aug 24 audit): Pro subscription grants used to be
 * written BY THE CLIENT (`applyProGrant`) under an owner carve-out in
 * firestore.rules — any modified client could mint "pro" for free.
 * The tier fields are now owner-unwritable in the rules; the ONLY
 * writer is this server-side path, invoked by `create-esewa-order`
 * after full payment verification.
 *
 * NOTE: `verify-identity/index.ts` carries a near-identical inline
 * copy of these helpers (it predates this module) — consolidating the
 * two into one shared module is a known follow-up.
 */

const FIREBASE_PROJECT_ID =
  Deno.env.get("FIREBASE_PRODUCT_ID") ??
  Deno.env.get("FIREBASE_PROJECT_ID") ??
  "";

const FIRESTORE_BASE =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Short-lived OAuth2 access token from the service account
 *  (cached ~50 min; tokens last 60 min). */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not set");
  const sa = JSON.parse(raw);

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_")
      .replace(/=+$/, "");

  const signingInput = `${enc(header)}.${enc(claim)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt =
    `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

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
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };
  return cachedToken.token;
}

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

/** Convert JS values to Firestore REST field format (subset: the
 *  scalar shapes the grant writes). */
function dataToFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === "string") {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
        fields[k] = { timestampValue: v };
      } else {
        fields[k] = { stringValue: v };
      }
    } else if (typeof v === "number") {
      fields[k] = Number.isInteger(v)
        ? { integerValue: String(v) }
        : { doubleValue: v };
    } else if (typeof v === "boolean") {
      fields[k] = { booleanValue: v };
    } else {
      throw new Error(`[firestore-rest] unsupported value type for "${k}"`);
    }
  }
  return fields;
}

/**
 * Merge-write specific fields on one document (PATCH + updateMask —
 * the REST equivalent of `setDoc(..., { merge: true })` limited to
 * the given keys). NOTE: REST PATCH creates the document when it
 * does not exist, so callers that must NOT create docs should call
 * `firestoreExists` first.
 *
 * @param documentPath Path relative to the documents root, e.g.
 *   `"users/${uid}/tutorProfile/default"` or `"tutors/${uid}"`.
 */
export async function firestorePatch(
  documentPath: string,
  data: Record<string, unknown>,
): Promise<void> {
  const token = await getAccessToken();
  const url = `${FIRESTORE_BASE}/${documentPath}`;
  const fields = dataToFields(data);

  const resp = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields,
      updateMask: { fieldPaths: Object.keys(fields) },
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(
      `[firestore-rest] PATCH ${documentPath} failed: ${resp.status} ${errText.slice(0, 200)}`,
    );
  }
}

/** True when the document exists (service-role read — bypasses all
 *  security rules). */
export async function firestoreExists(documentPath: string): Promise<boolean> {
  const token = await getAccessToken();
  const url = `${FIRESTORE_BASE}/${documentPath}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status === 404) return false;
  if (!resp.ok) {
    throw new Error(`[firestore-rest] GET ${documentPath} failed: ${resp.status}`);
  }
  return true;
}
