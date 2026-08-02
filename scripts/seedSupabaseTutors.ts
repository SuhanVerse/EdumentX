/**
 * EdumentX — Seed Supabase Tutors
 *
 * Copies approved tutors from Firebase Firestore into Supabase PostgreSQL
 * for the AI chatbot's hybrid search engine.
 *
 * ⚠️ Prerequisites:
 *   1. Download a Firebase service account JSON file:
 *      Firebase Console → Project Settings → Service Accounts → Generate key
 *      Save it as `firebase-service-account.json` in the project root.
 *
 *   2. Set env vars (or add to .env):
 *      SUPABASE_URL=  (from Supabase Dashboard → Settings → API)
 *      SUPABASE_SERVICE_ROLE_KEY=  (same page, service_role key)
 *      HF_API_TOKEN=  (HuggingFace token for embeddings)
 *
 * Usage:
 *   npx ts-node scripts/seedSupabaseTutors.ts
 *
 * What it does:
 *   1. Reads all tutors from Firestore `tutors/{uid}` collection
 *   2. Filters: only `verificationStatus === "approved"`
 *   3. For each tutor:
 *      - Upserts into Supabase `tutors` table
 *      - Generates 384-dim embedding via HuggingFace
 *      - Upserts into `tutor_embeddings` table
 *   4. Reports progress and errors
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";
import * as dns from "dns";
import * as fs from "fs";
import * as path from "path";

// Fix Node.js DNS resolution on Windows: trust the system DNS order
// instead of requiring IPv4 records first. Without this, DNS queries
// for hosts with only IPv6 (AAAA) records silently fail with ENODATA.
// Wrapped in try/catch for safety on older Node versions (< v22).
try {
  dns.setDefaultResultOrder("verbatim");
} catch {
  // Older Node version — DNS resolution will use the default (ipv4first)
}

// Load .env file from the project root (where the script is run from).
// dotenv is not listed in dependencies, so we manually load env vars.
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eqIndex = trimmed.indexOf("=");
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

// If we're running as a compiled script from dist/, also check parent dir
const parentEnvPath = path.resolve(process.cwd(), "..", ".env");
if (!fs.existsSync(envPath) && fs.existsSync(parentEnvPath)) {
  const envContent = fs.readFileSync(parentEnvPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eqIndex = trimmed.indexOf("=");
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || "";
const HF_API_TOKEN = process.env.HF_API_TOKEN || process.env.EXPO_PUBLIC_HF_API_TOKEN || "";

// Try both possible filenames (user may have named it differently)
const POSSIBLE_SA_NAMES = ["private_key_firebase.json", "firebase-service-account.json", "service-account.json", "serviceAccountKey.json"];

function resolveServiceAccountPath(): string {
  for (const name of POSSIBLE_SA_NAMES) {
    // Check in project root
    const rootPath = path.resolve(process.cwd(), name);
    if (fs.existsSync(rootPath)) return rootPath;
    // Check in dist/ parent
    const distParent = path.resolve(process.cwd(), "..", name);
    if (fs.existsSync(distParent)) return distParent;
  }
  // Return first option for error message
  return path.resolve(process.cwd(), POSSIBLE_SA_NAMES[0]);
}

// HuggingFace embedding model
const EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5";
const EMBEDDING_DIM = 384;

// ─── Validation ──────────────────────────────────────────────────────────────

const errors: string[] = [];
if (!SUPABASE_URL) errors.push("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) errors.push("Missing SUPABASE_SERVICE_ROLE_KEY");
if (!HF_API_TOKEN) errors.push("Missing HF_API_TOKEN (HuggingFace token)");
const resolvedServiceAccountPath = resolveServiceAccountPath();
if (!fs.existsSync(resolvedServiceAccountPath)) {
  errors.push(
    `Missing Firebase service account file at: ${resolvedServiceAccountPath}\n` +
    "  Download from: Firebase Console → Project Settings → Service Accounts → Generate key",
  );
}

if (errors.length > 0) {
  console.error("\n❌ Configuration errors:");
  errors.forEach((e) => console.error(`   • ${e}`));
  console.error("\nFix these and re-run.\n");
  process.exit(1);
}

// ─── Clients ─────────────────────────────────────────────────────────────────

console.log("\n🔌 Initializing clients...");

// Firebase Admin (v14 modular API)
const serviceAccount = JSON.parse(
  fs.readFileSync(resolvedServiceAccountPath, "utf-8"),
);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
const firestore = getFirestore();

// Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("   ✅ Firebase Admin initialized");
console.log("   ✅ Supabase client initialized");

// ─── HuggingFace Embedding Function ──────────────────────────────────────────

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${EMBEDDING_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`   ⚠️  HuggingFace API error (${response.status}): ${errorText.slice(0, 200)}`);
      
      // Retry once after a delay for 503 (cold start)
      if (response.status === 503) {
        console.log("   ⏳ Model cold start, waiting 15s and retrying...");
        await new Promise((r) => setTimeout(r, 15000));
        return generateEmbedding(text);
      }
      return null;
    }

    const result = await response.json();

    // bge-small-en-v1.5 returns an array of token embeddings.
    // We take the [CLS] token (first element) as the sentence embedding,
    // or if it returns a flat array, use that directly.
    if (Array.isArray(result)) {
      if (result.length > 0 && Array.isArray(result[0])) {
        return result[0] as number[];
      }
      return result as number[];
    }

    return null;
  } catch (err) {
    console.warn(`   ⚠️  HuggingFace request failed:`, err);
    return null;
  }
}

// ─── Build Embedding Text ────────────────────────────────────────────────────

function buildEmbeddingText(tutor: Record<string, unknown>): string {
  const parts: string[] = [];

  if (tutor.headline) parts.push(tutor.headline as string);
  if (tutor.bio) parts.push(tutor.bio as string);
  if (tutor.subjects && Array.isArray(tutor.subjects)) {
    parts.push(`Subjects: ${(tutor.subjects as string[]).join(", ")}`);
  }
  if (tutor.gradesTeaching && Array.isArray(tutor.gradesTeaching)) {
    parts.push(`Teaches: ${(tutor.gradesTeaching as string[]).join(", ")}`);
  }
  if (tutor.degree) parts.push(`Degree: ${tutor.degree}`);
  if (tutor.institution) parts.push(`From: ${tutor.institution}`);
  if (tutor.location) {
    const loc = tutor.location as { neighborhood?: string; city?: string };
    const locStr = [loc.neighborhood, loc.city].filter(Boolean).join(", ");
    if (locStr) parts.push(`Location: ${locStr}`);
  }
  if (tutor.yearsExperience != null) {
    parts.push(`${tutor.yearsExperience} years of teaching experience`);
  }
  // Budget + gender (Phase 4, W11) — helps "under Rs 5000" / "female tutor"
  // queries match semantically, mirroring ai/embeddings/buildEmbeddingText.ts.
  if (tutor.monthlyRateNpr != null && Number(tutor.monthlyRateNpr) > 0) {
    parts.push(`Monthly rate around Rs ${tutor.monthlyRateNpr}`);
  }
  if (tutor.gender) {
    const g = String(tutor.gender);
    parts.push(`${g.charAt(0).toUpperCase()}${g.slice(1)} tutor`);
  }

  return parts.join(". ") || "Tutor profile";
}

// ─── Main Seed Function ──────────────────────────────────────────────────────

interface SeedStats {
  total: number;
  approved: number;
  synced: number;
  skipped: number;
  errors: number;
  approvedUids: string[];  // UIDs of approved tutors, for cleanup
}

async function seedTutors(): Promise<SeedStats> {
  const stats: SeedStats = {
    total: 0,
    approved: 0,
    synced: 0,
    skipped: 0,
    errors: 0,
    approvedUids: [],
  };

  console.log("\n📚 Reading tutors from Firestore...");

  // Read from Firestore `tutors/{uid}` collection
  const tutorsSnapshot = await firestore.collection("tutors").get();
  stats.total = tutorsSnapshot.size;

  console.log(`   Found ${stats.total} tutor documents in Firestore\n`);

  for (const doc of tutorsSnapshot.docs) {
    const uid = doc.id;
    const data = doc.data() as Record<string, unknown>;
    const verificationStatus = data.verificationStatus as string;

    // Only sync approved tutors
    if (verificationStatus !== "approved") {
      console.log(`   ⏭️  ${uid} — status: ${verificationStatus}, skipping`);
      stats.skipped++;
      continue;
    }

    stats.approved++;
    stats.approvedUids.push(uid);
    console.log(`   🔄 ${uid} — ${(data.fullName as string) || "unnamed"}`);

    try {
      // ── 1. Build embedding text ──
      const embeddingText = buildEmbeddingText(data);

      // ── 2. Generate embedding ──
      let embedding: number[] | null = null;
      console.log(`      Generating embedding via HuggingFace...`);
      embedding = await generateEmbedding(embeddingText);

      if (embedding && embedding.length !== EMBEDDING_DIM) {
        console.warn(
          `      ⚠️  Expected ${EMBEDDING_DIM}-dim embedding, got ${embedding.length}. Truncating/padding.`,
        );
        if (embedding.length > EMBEDDING_DIM) {
          embedding = embedding.slice(0, EMBEDDING_DIM);
        } else {
          embedding = [...embedding, ...new Array(EMBEDDING_DIM - embedding.length).fill(0)];
        }
      }

      // ── 3. Upsert into Supabase `tutors` table ──
      const locationRaw = data.location as Record<string, unknown> | null | undefined;
      const neighborhood = typeof locationRaw?.neighborhood === "string" ? locationRaw.neighborhood : "";
      const city = typeof locationRaw?.city === "string" ? locationRaw.city : "";

      // NOTE: `location_text` is a PostgreSQL GENERATED column.
      // The database computes it automatically from neighborhood + city.
      // Do NOT include it in the upsert — PostgreSQL will reject it.
      const tutorRecord = {
        id: uid,
        full_name: data.fullName || "",
        username: data.username || "",
        headline: data.headline || "",
        bio: data.bio || "",
        subjects: Array.isArray(data.subjects) ? data.subjects : [],
        grades_teaching: Array.isArray(data.gradesTeaching) ? data.gradesTeaching : [],
        years_experience: typeof data.yearsExperience === "number" ? data.yearsExperience : 0,
        monthly_rate_npr: typeof data.monthlyRateNpr === "number" ? data.monthlyRateNpr : 0,
        neighborhood: neighborhood,
        city: city,
        latitude: typeof data.latitude === "number" ? data.latitude : null,
        longitude: typeof data.longitude === "number" ? data.longitude : null,
        rating: typeof data.rating === "number" ? data.rating : 0,
        review_count: typeof data.reviewCount === "number" ? data.reviewCount : 0,
        response_rate: typeof data.responseRate === "number" ? data.responseRate : 0,
        verification_status: (data.verificationStatus as string) || "pending",
        is_verified_professional: data.isVerifiedProfessional === true,
        degree: data.degree || "",
        institution: data.institution || "",
        photo_url: typeof data.photoUrl === "string" ? data.photoUrl : null,
        phone: data.phone || "",
        email: data.email || "",
        gender:
          data.gender === "male" || data.gender === "female" || data.gender === "other"
            ? (data.gender as string)
            : null,
        // New in migration 009 — required for chatbot's tutoring_mode filter.
        tutoring_mode:
          data.tutoringMode === "home" ||
          data.tutoringMode === "online" ||
          data.tutoringMode === "both"
            ? (data.tutoringMode as string)
            : "both",
        // New in migration 009 — required for chatbot's language filter.
        languages: Array.isArray(data.languages)
          ? (data.languages as string[])
          : ["English", "Nepali"],
      };

      const { error: tutorError } = await supabase
        .from("tutors")
        .upsert(tutorRecord, { onConflict: "id" });

      if (tutorError) {
        console.error(`      ❌ Supabase tutors upsert error:`, tutorError);
        stats.errors++;
        continue;
      }

      // ── 4. Upsert into Supabase `tutor_embeddings` table ──
      if (embedding) {
        const { error: embedError } = await supabase
          .from("tutor_embeddings")
          .upsert(
            {
              tutor_id: uid,
              embedding: embedding,
              source_text: embeddingText,
              // The column is `model_name` (migration 003); `model` does not
              // exist and would make the upsert fail with a column error.
              model_name: EMBEDDING_MODEL,
            },
            { onConflict: "tutor_id" },
          );

        if (embedError) {
          console.error(`      ❌ Embedding upsert error:`, embedError);
          stats.errors++;
          continue;
        }
      } else {
        console.warn(`      ⚠️  No embedding generated, skipping embeddings table`);
      }

      console.log(`      ✅ Synced successfully`);
      stats.synced++;
    } catch (err) {
      console.error(`      ❌ Error syncing tutor ${uid}:`, err);
      stats.errors++;
    }
  }

  return stats;
}

// ─── Cleanup Stale Tutors ─────────────────────────────────────────────────

async function cleanupStaleTutors(syncedUids: Set<string>): Promise<number> {
  console.log("\n🧹 Checking for stale tutors in Supabase...");

  // Fetch all tutor IDs currently in Supabase
  const { data: existing, error: fetchError } = await supabase
    .from("tutors")
    .select("id");

  if (fetchError) {
    console.error(`   ❌ Failed to fetch existing Supabase tutors:`, fetchError);
    return 0;
  }

  const staleIds = (existing || [])
    .map((r) => r.id)
    .filter((id) => !syncedUids.has(id));

  if (staleIds.length === 0) {
    console.log("   ✅ No stale tutors to clean up");
    return 0;
  }

  console.log(`   Found ${staleIds.length} stale tutor(s) to remove: ${staleIds.join(", ")}`);

  // Delete orphaned embeddings first (foreign key constraint)
  const { error: embedDelError } = await supabase
    .from("tutor_embeddings")
    .delete()
    .in("tutor_id", staleIds);

  if (embedDelError) {
    console.error(`   ❌ Failed to delete stale embeddings:`, embedDelError);
  } else {
    console.log(`   ✅ Deleted ${staleIds.length} orphaned embedding(s)`);
  }

  // Delete stale tutors
  // Delete in batches of 10 to avoid URL length limits
  let deleted = 0;
  for (let i = 0; i < staleIds.length; i += 10) {
    const batch = staleIds.slice(i, i + 10);
    const { error: delError } = await supabase
      .from("tutors")
      .delete()
      .in("id", batch);

    if (delError) {
      console.error(`   ❌ Failed to delete stale tutors batch:`, delError);
    } else {
      deleted += batch.length;
    }
  }

  console.log(`   ✅ Deleted ${deleted}/${staleIds.length} stale tutor(s) from Supabase`);
  return deleted;
}

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  EdumentX — Seed Tutor Data to Supabase");
  console.log("═══════════════════════════════════════════\n");

  const startTime = Date.now();

  try {
    const stats = await seedTutors();

    // Cleanup: remove Supabase tutors that no longer exist in Firestore
    await cleanupStaleTutors(new Set(stats.approvedUids));

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n═══════════════════════════════════════════");
    console.log("  ✅ Seed Complete");
    console.log("═══════════════════════════════════════════");
    console.log(`  Duration:       ${duration}s`);
    console.log(`  Total in Firestore: ${stats.total}`);
    console.log(`  Approved tutors:    ${stats.approved}`);
    console.log(`  Synced to Supabase: ${stats.synced}`);
    console.log(`  Skipped (unapproved): ${stats.skipped}`);
    console.log(`  Errors:             ${stats.errors}`);
    console.log("═══════════════════════════════════════════\n");

    // Phase 4 (W13): the IVFFlat index from migration 011 was created at
    // migration time — possibly on an empty table. For optimal centroids
    // after a large re-seed, drop and recreate it over the current data:
    //
    //   DROP INDEX IF EXISTS idx_tutor_embeddings_ivfflat;
    //   CREATE INDEX idx_tutor_embeddings_ivfflat
    //     ON public.tutor_embeddings USING ivfflat (embedding vector_cosine_ops)
    //     WITH (lists = 10);
    console.log("💡 Tip: after a large re-seed, rebuild the IVFFlat index so its");
    console.log("   centroids recompute over the current data (see code comment above).");
  } catch (err) {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  }
}

main();
