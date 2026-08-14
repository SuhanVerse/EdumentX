/**
 * Deployed-vs-local Firestore rules drift check.
 *
 * Fetches the latest RELEASED ruleset from the Firebase Rules API
 * (`firebaserules.googleapis.com`) using the service account from
 * `GOOGLE_APPLICATION_CREDENTIALS`, then compares it with the local
 * `firebase/firestore.rules` (whitespace/comments normalized).
 *
 * Fails (exit 1) when they differ — so `npm run test:rules` catches
 * drift between what's deployed to `edumentx-dev` and what's in the
 * repo, even when the emulator test (which uses the LOCAL file) passes.
 *
 * The service account needs the `cloud-platform` scope; the Rules API
 * returns the source as `source.files[0].content`.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   npm run test:rules
 */

import { readFileSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";

const PROJECT = process.env.RULES_TEST_PROJECT ?? "edumentx-dev";
const LOCAL_RULES = process.env.RULES_LOCAL_FILE ?? "firebase/firestore.rules";

/** Strip comments + collapse whitespace so formatting drift doesn't
 *  trip the check — only semantic content matters. */
function normalize(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/\/\/[^\n]*/g, "") // line comments
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchDeployedSource() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const bearer = `Bearer ${token.token}`;

  // 1. Find the latest release (it points at the active ruleset).
  const releasesRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases`,
    { headers: { Authorization: bearer } },
  );
  if (!releasesRes.ok) {
    throw new Error(`releases fetch failed: ${releasesRes.status} ${await releasesRes.text()}`);
  }
  const releases = (await releasesRes.json()).releases ?? [];
  if (releases.length === 0) {
    throw new Error(`no releases found for ${PROJECT}`);
  }
  const latest = releases[releases.length - 1];
  const rulesetName = latest.rulesetName;

  // 2. Fetch that ruleset's source.
  const rulesetRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets/${rulesetName.split("/").pop()}`,
    { headers: { Authorization: bearer } },
  );
  if (!rulesetRes.ok) {
    throw new Error(`ruleset fetch failed: ${rulesetRes.status} ${await rulesetRes.text()}`);
  }
  const body = await rulesetRes.json();
  const source = body.source?.files?.[0]?.content;
  if (typeof source !== "string") {
    throw new Error(`no rules source in ruleset ${rulesetName}`);
  }
  return { rulesetName, source };
}

async function main() {
  const local = readFileSync(LOCAL_RULES, "utf8");
  const { rulesetName, source: deployed } = await fetchDeployedSource();

  const localNorm = normalize(local);
  const deployedNorm = normalize(deployed);

  console.log(`  deployed ruleset: ${rulesetName.split("/").pop()}`);

  if (localNorm === deployedNorm) {
    console.log("  ✅ Deployed rules match local firebase/firestore.rules");
    return;
  }

  console.error("  ❌ DEPLOY DRIFT: deployed rules differ from local!");
  // Find the first differing token for a useful hint.
  const l = localNorm.split(" ");
  const d = deployedNorm.split(" ");
  let i = 0;
  while (i < Math.max(l.length, d.length) && l[i] === d[i]) i += 1;
  console.error(`     first diff at token ${i}:`);
  console.error(`       local:     …${l.slice(Math.max(0, i - 3), i + 4).join(" ")}…`);
  console.error(`       deployed:  …${d.slice(Math.max(0, i - 3), i + 4).join(" ")}…`);
  console.error("     Run `npm run deploy:rules` to sync, then re-run this check.");
  process.exitCode = 1;
}

main().catch((err) => {
  console.error("Deployed-rules check failed:", err.message);
  process.exitCode = 1;
});
