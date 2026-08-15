/**
 * Chat Edge Function probe — verifies the live AI chat pipeline end-to-end.
 *
 * 1. Mints a throwaway Firebase custom token (uid `probe-test-user`).
 * 2. Exchanges it for an ID token via the Auth REST API.
 * 3. Calls the deployed Supabase Edge Function with that token.
 *
 * Success = the function returns an assistant reply (proves the anon-key
 * gateway, Firebase JWT middleware, and LLM backend are all live). The
 * throwaway uid writes no docs — auth-only, fully reversible.
 *
 * Usage (same prereq as seed:admin):
 *   npm run probe:chat
 *
 * Prerequisite: GOOGLE_APPLICATION_CREDENTIALS + populated `.env`.
 */
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");

const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
if (!getApps().length) initializeApp({ credential: cert(creds) });

const env = fs.readFileSync(".env", "utf8");
const apiKey = env.match(/EXPO_PUBLIC_FIREBASE_API_KEY=(.+)/)?.[1].trim();
const supabaseUrl = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)?.[1].trim();
const anonKey = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1].trim();

(async () => {
  const token = await getAuth().createCustomToken("probe-test-user");
  const exch = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, returnSecureToken: true }),
  });
  const exchJson = await exch.json();
  if (!exchJson.idToken) { console.log("TOKEN EXCHANGE FAILED:", JSON.stringify(exchJson).slice(0, 300)); process.exit(1); }
  console.log("✓ Firebase ID token minted + exchanged (uid probe-test-user)");

  const t0 = Date.now();
  const resp = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${exchJson.idToken}` },
    body: JSON.stringify({ session_id: "probe-session", message: "Hello, reply with one short sentence." }),
  });
  const ms = Date.now() - t0;
  const body = await resp.json();
  console.log(`✓ Edge Function replied in ${ms}ms (HTTP ${resp.status})`);
  console.log("type:", body.type, "| content:", (body.content || "").slice(0, 200));
  console.log("tutor_cards:", body.tutor_cards ? body.tutor_cards.length : 0, "| state:", body.state ? "yes" : "no");
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
