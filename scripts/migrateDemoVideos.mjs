/**
 * migrate-demo-videos — one-off helper for supabase/migrations/
 * 016_private_verification_docs.sql (Aug 24 audit fix #2).
 *
 * Copies existing tutor intro videos (`{uid}/demo.{ext}`) out of the
 * now-PRIVATE `private-verification-docs` bucket into the new PUBLIC
 * `tutor-demo-videos` bucket, so the student-facing details screen
 * keeps playing them after the flip.
 *
 * Usage (env or .env):
 *   SUPABASE_URL=https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key>
 *
 *   node scripts/migrateDemoVideos.mjs            # dry-run list
 *   node scripts/migrateDemoVideos.mjs --copy     # perform copy
 *
 * Safe to re-run — copies are idempotent (upsert semantics), and
 * originals are left in place (the private copies are inert).
 */

import fs from "node:fs";

// Load .env manually (no dotenv dependency in scripts).
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const URL_ = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DO_COPY = process.argv.includes("--copy");

if (!URL_ || !KEY) {
  console.error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (env or .env).",
  );
  process.exit(1);
}

const SRC = "private-verification-docs";
const DST = "tutor-demo-videos";

async function api(method, path, body) {
  const res = await fetch(`${URL_}/storage/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

/** Ensure destination bucket exists + is public. */
async function ensureBucket() {
  const buckets = await api("GET", "bucket");
  if (!buckets.some((b) => b.id === DST)) {
    await api("POST", "bucket", { id: DST, name: DST, public: true });
    console.log(`created bucket: ${DST} (public)`);
  } else {
    console.log(`bucket exists: ${DST}`);
  }
}

/** Recursively list demo.* objects under every {uid}/ prefix.
 *  Raw list API returns an ARRAY; folder entries carry id === null
 *  and a trailing slash on name. */
async function listDemoObjects(prefix = "") {
  const entries = await api("POST", `object/list/${SRC}`, {
    prefix,
    limit: 1000,
    delimiter: "/",
  });
  let found = [];
  if (!Array.isArray(entries)) return found;
  for (const e of entries) {
    if (e.id === null || e.name.endsWith("/")) {
      found = found.concat(await listDemoObjects(`${prefix}${e.name}`));
    } else if (/demo\.[a-z0-9]+$/i.test(e.name)) {
      found.push({ ...e, name: `${prefix}${e.name}` });
    }
  }
  return found;
}

async function main() {
  await ensureBucket();
  const demos = await listDemoObjects();
  console.log(`found ${demos.length} demo object(s):`);
  for (const o of demos) console.log(`  ${SRC}/${o.name}`);
  if (!DO_COPY) {
    console.log("\ndry run only — re-run with --copy to perform the copies.");
    return;
  }
  for (const o of demos) {
    // Server-side copy via move API with copy semantics.
    await api("POST", "object/copy", {
      bucketId: SRC,
      sourceKey: o.name,
      destinationBucket: DST,
      destinationKey: o.name,
    });
    console.log(`copied → ${DST}/${o.name}`);
  }
  console.log("\nDone. You can now safely keep 016's private flip applied.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
