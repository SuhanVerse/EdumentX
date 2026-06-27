# Gemini Antigravity + Claude — Integration Guide

> **Audience**: anyone setting up the EdumentX Firebase sprint with both tools in their AI Pro plan.
> **Last updated**: June 12, 2026

This doc explains what **Antigravity** is, what it can and cannot do, and how to pair it with **Claude Code** (which I am) so the two systems cover the full Firebase sprint without stepping on each other.

---

## 1. What is Antigravity?

**Antigravity** is the Firebase/Google-Cloud console agent bundled with the **Google AI Pro** plan. It is a *web/SPA tool* that lives in the Firebase Console side panel and acts as an operations copilot for the GCP / Firebase surfaces. You will see it as a chat-style assistant in the Firebase Console (and the broader Google Cloud Console).

Concretely it can:

- **Create, list, and configure** Firebase projects, apps (Android / iOS / Web), and Firebase services (Auth, Firestore, Storage, Functions, Hosting, Extensions).
- **Read & write Firestore documents and collections** through the console (great for "show me the docs the seed script created").
- **Write, deploy, and test security rules** (`firestore.rules`, `storage.rules`) and composite indexes (`firestore.indexes.json`).
- **Trigger emulator runs** and inspect their state.
- **Generate seed scripts** that target the right project + region.
- **Explain what a rule does** in plain English (handy for reviews).
- **Connect to a local `firebase` CLI session** and execute commands on your behalf (with your permission).

It cannot:

- Run your **React Native app** (it has no device/emulator bridge).
- Edit files in your **local repo** directly — at most it can paste a diff that you apply.
- **Sign your code** or push to a remote git.
- Replace a real Cloud Function backend (it can scaffold them, but you'd still `firebase deploy` yourself).
- Read your **private source code** — unless you paste it into the chat.

Treat Antigravity as the **"Firebase-aware operations agent"** and Claude Code as the **"repo-aware engineering agent"**. They overlap only on rules writing; everywhere else the division is clean.

---

## 2. What is Claude Code in this setup?

Claude Code is the CLI/IDE agent in this conversation. I have direct read access to your local repo (`screens/`, `app/`, `tailwind.config.js`, `lib/registration.ts`, `firebase/firestore.rules`, etc.) and I can edit files, run shell commands (with your permission), and reason across the whole codebase in one context window.

I am best at:

- Translating the **plan** in `05-Build-and-Deploy/firebase-auth-plan.md` into actual code.
- Wiring the React Native screens to the Firebase JS SDK.
- Debugging **TypeScript / Metro / build / dev-client** errors (because I can see your `babel.config.js`, `metro.config.js`, `package.json`).
- Auditing the plan for errors — I just did that on June 12, 2026 (see `firebase-auth-plan-audit.md`).
- Running the dev client (`npx expo start -c`) and reading its logs.

I am **not** the right tool for:

- Initial **project creation** in the Firebase Console (Antigravity is faster).
- Choosing the **Firestore region** (Antigravity sees the GCP project list).
- Setting up **Cloud Functions** deploy pipelines (Antigravity has the deploy context; I have the code).
- Configuring **billing / Blaze plan** (Antigravity only — that requires GCP auth).

---

## 3. When to use which

| Task | Use | Why |
|------|-----|-----|
| Create `edumentx-dev` Firebase project | Antigravity | Console op, no code involved |
| Enable Phone auth + add test phone number | Antigravity | Console op |
| Set up Firestore (region, mode, indexes) | Antigravity | Console op |
| Set up Storage bucket | Antigravity | Console op |
| Register the Android app in the Firebase Console | **You** (Console op) | Antigravity can help; you need to paste the SHA-1/SHA-256 from `eas credentials` and click the download button |
| Drop `google-services.json` at the project root | **You** (file op) | Antigravity sees the file in the console; you drag it to disk |
| Generate `seedAdmins.ts` | **Me** | I see the existing code shape |
| Write `firebase/firestore.rules` | **Me** (Antigravity for review) | I have the existing rules + the corrected plan; Antigravity can review and explain |
| Write `services/firebase/authService.ts` (RNFirebase native) | **Me** | Code work, I see `app/_layout.tsx` + `tailwind.config.js` + the screens |
| Write `store/authStore.ts` | **Me** | I see `lib/registration.ts` pattern |
| Refactor `PhoneEntryScreen` to call `auth().signInWithPhoneNumber` | **Me** | I see the screen — the call is now 1-arg, no `RecaptchaVerifier` |
| Create `screens/dashboards/*.tsx` | **Me** | I see the design tokens |
| Create `app/(app)/*` routes | **Me** | I see the existing `app/` routes |
| Add a new test phone number in Auth | Antigravity | Console op |
| Read a doc from the Firestore console | Antigravity | Console op |
| Diagnose a `permission-denied` error | **Both** — start with me (I see the rules + the call site), escalate to Antigravity if the rule is right but the doc is malformed |
| Diagnose a `auth/app-not-authorized` or `auth/invalid-app-credential` error | **You** (Console op + me) | These are usually `google-services.json` SHA-1/SHA-256 fingerprint mismatches. Re-verify in Firebase Console, re-download the file, rebuild the dev client. |
| Diagnose a build error / TurboModule error | **Me** | I see `babel.config.js`, `package.json`, `metro.config.js` |
| Review the rules I wrote | **Antigravity** | "Explain what this rule does" / "Find gaps" |

> **Note on the SDK pivot (June 12, 2026)**: the table reflects the post-override architecture. RNFirebase does **not** need a `RecaptchaVerifier` or `react-native-webview`. If Antigravity suggests those, push back — they would be the JS-SDK-era pattern. RNFirebase uses native Google Play Integrity (Android) / APNs (iOS) for device verification.

---

## 4. A concrete sprint workflow (the "Antigravity + Claude" dance)

The fastest path through Phase B + C looks like this. Numbers in **[A]** = Antigravity step, **[C]** = Claude step.

### Day 1: Project bootstrap

1. **[A]** Open Firebase Console → "Add project" → `edumentx-dev`, region `asia-south1`, Analytics on.
2. **[A]** Enable **Authentication → Phone** provider.
3. **[A]** Add test phone `+9779800000000` with code `123456` in the Phone provider.
4. **[A]** Create **Firestore Database** in production mode, region `asia-south1`.
5. **[A]** Create **Storage** in production mode.
6. **[A]** Project Settings → Your apps → click **Add app** → **Android** icon → package name `com.anonymous.edumentx`. Paste the SHA-1 and SHA-256 fingerprints (from your `eas credentials` → Display Fingerprint output) into the dialog. Click **Register app** → **Download google-services.json**.
7. **[you]** Save `google-services.json` to the **project root** (same level as `app.json` and `package.json`).
8. **[C]** (me) Apply the babel fix to `babel.config.js`, install `@react-native-firebase/app` + `@react-native-firebase/auth` + `@react-native-firebase/firestore` + `expo-build-properties`, uninstall `firebase` + `react-native-webview`, add the `expo-build-properties` plugin to `app.json` — see `IMPLEMENTATION_ROADMAP.md §B`.
9. **[you]** Rebuild the dev client: `eas build --profile development --platform android --clear-cache`. Install the new APK on your Realme.

### Day 2: Code wiring

10. **[C]** (me) Implement Steps 0–8 of the plan. After each step I run `npm run typecheck` to catch regressions.
11. **[C]** (me) Update `firebase/firestore.rules` (Step 10) with the subcollection allows + the public-read admins rule.
12. **[you]** Commit and push so I can see the current state on the next turn.

### Day 3: Console deploy + e2e

13. **[A]** Open the Firestore Rules tab in the console.
14. **[A]** Paste the contents of `firebase/firestore.rules` from the repo and click **Publish**. (Alternatively, run `firebase deploy --only firestore:rules` locally — Antigravity is just faster for the first time.)
15. **[A]** Open the Firestore Data tab. Create a doc at `admins/seed-001` with `{ email: "admin@edumentx.dev", displayName: "Seed Admin", role: "admin", salt: "...", passwordHash: "..." }` — get the salt + hash from the `scripts/seedAdmins.ts` output. (Or just run `node scripts/seedAdmins.ts` and let the script do it.)
16. **[you]** Run `npx expo start -c` and walk the 3 e2e paths in plan Step 13.
17. **[C]** (me) Debug any errors that come up. I have the logs context from previous sessions.

> **RNFirebase debugging tips for the e2e day**:
> - If `auth/app-not-authorized` → the SHA-1/SHA-256 in `google-services.json` doesn't match what's in the Firebase Console. Re-run `eas credentials`, re-paste, re-download.
> - If "Firebase not initialized" appears in Metro logs → `google-services.json` is missing from the project root, or the Android package name in `app.json` (`com.anonymous.edumentx`) doesn't match the `package_name` field in `google-services.json`.
> - If the OTP arrives but `confirmation.confirm(code)` returns `auth/invalid-verification-code` → emulator might be using a stale test phone number. Re-add it in the Firebase Console.

---

## 5. The rules-review feedback loop

This is the one place where the two tools genuinely overlap. The recommended pattern:

1. **I write the rules** (Step 10 of the plan) because I have the data-shape context.
2. **You paste the rules into Antigravity** with the prompt: *"Explain what these rules do in plain English. Find any read/write path that a malicious user could exploit. Find any path that would break the happy-path code in `services/firebase/firestoreService.ts`."*
3. **Antigravity returns a review.** You paste the review back to me.
4. **I update the rules** to address the findings.
5. **Antigravity re-reviews** the diff.
6. Repeat until the review is clean (usually 1–2 rounds for v1 rules).

Antigravity is genuinely good at this kind of static review because it knows the Firebase rules grammar. I'm good at the first-draft because I have the data-shape context. The two-tool loop converges fast.

---

## 6. What Antigravity can NOT fix in this sprint

- The **`installTurboModule called with 0 arguments`** error — that's a native module wiring problem. I diagnosed it on June 12, 2026 and the fix is in `IMPLEMENTATION_ROADMAP.md §B.1`. Antigravity has no visibility into your `babel.config.js`.
- The **CSS not loading in the dev client** — also a native-bundling problem. I traced it to the `postcss.config.js` chain. Antigravity doesn't see Metro or babel.
- The **"Expo Go mismatch" / `192.168.1.104:8081` "couldn't load asset"** errors — those are dev-client-vs-Expo-Go version skew + firewall issues (`sudo ufw allow 8081/tcp` or `--tunnel` mode). I can help; Antigravity can't.
- **Custom Theme / NativeWind token questions** — those need the actual `tailwind.config.js` content, which is in the repo. I have it; Antigravity doesn't.

If a problem is "my code does X and I expected Y", bring it to me first. If a problem is "the Firebase console says Z and I don't know what to do", bring it to Antigravity first.

---

## 7. Prompting tips for each tool

### For Antigravity (Firebase console)

- **Be specific about the project ID.** "Create a Firestore database in `edumentx-dev`" works; "create a database" might land in the wrong project if you have multiple.
- **Reference rules by path.** "Allow `/users/{userId}/tutorProfile/{document=**}`" beats "allow tutors to read their profile".
- **Ask for a diff.** "Show me the diff of the rules I just pasted vs. what you'd write" is a great review prompt.
- **Don't paste secrets.** The `EXPO_PUBLIC_FIREBASE_API_KEY` is technically public, but keep `serviceAccountKey.json` and `firebase-admin` private keys out of the chat.

### For me (Claude Code)

- **Reference the plan by name.** "Implement Step 5 of the plan in `05-Build-and-Deploy/firebase-auth-plan.md`" is precise.
- **Paste errors verbatim.** Metro / babel / Firebase errors are the highest-signal input.
- **Tell me when you've changed something outside this session.** If you ran `eas build` or `firebase deploy` between turns, say so — I don't see those side effects until you tell me.
- **Stop me if I invent a path.** If I say "edit `services/validation/phone.ts`" but the file structure is different, correct me. I can `ls` the directory to verify but a heads-up is faster.

---

## 8. When one tool contradicts the other

Antigravity might suggest a rules pattern that I think is wrong because of a v1 caveat (e.g. "use `request.auth.token.admin == true`" — but v1 has no Firebase Auth for admins). The tie-breaker rule:

> **The plan (`firebase-auth-plan.md`) + the operations doc (`phase-3-notes.md`) are the source of truth.** If Antigravity suggests something that contradicts the plan, default to the plan and explain the contradiction back to Antigravity in the next prompt. If I (Claude) suggest something that contradicts the plan, point it out and I'll re-read the plan and correct.

---

*Maintained by SuhanVerse · June 12, 2026*
