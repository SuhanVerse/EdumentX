# EdumentX — Deployment & Distribution Guide

_Aug 25, 2026 · covers getting the app onto other phones, closed-app
messaging, and the Blaze-plan features this project actually uses._

---

## 0. TL;DR — which command when

| Goal | Command | Rebuild native? |
|---|---|---|
| Daily dev on YOUR phone | `npx expo run:android` (once), then Metro reload (`r`) | only when native deps/config change |
| Give the app to OTHER testers (Android) | `eas build -p android --profile preview` → share APK link | no |
| App stores / public release | `eas build -p android --profile production` + `eas submit` | no |
| iOS on another iPhone | TestFlight: `eas build -p ios --profile production` + `eas submit -p ios` | no |
| JS-only changes to an installed build | `eas update --branch production` (OTA, instant) | no |

**`npx expo run:android` is a DEV-time command.** It compiles a debug APK
with Metro hot-reload and installs it via USB. Other people's phones do
NOT need it — they install a built artifact (APK from EAS, or store
listing). You only re-run it locally when native plugins/deps change
(e.g. we add `expo-video-thumbnails` next).

iOS requires macOS + Xcode for `run:ios`; for other iPhones use
TestFlight (needs Apple Developer account, $99/yr).

---

## 1. Current distribution state

- **Package name**: `com.anonymous.edumentx` ← placeholder; change in
  `app.json` → `android.package` / `ios.bundleIdentifier` BEFORE any
  store/EAS production build (e.g. `com.edumentx.app`).
- **Dev client** is already built & working (your RMX3630).
- **Backend**: Firebase project `edumentx-dev`; Supabase project
  `cuedmkwgkpipczhedpem`.

## 2. Android testers (fastest path)

```bash
npm i -g eas-cli          # once
eas login                 # your Expo account
eas build:init            # links project (accept defaults)

eas build -p android --profile preview
```

- `preview` profile builds a **direct-install APK**.
- When done, EAS prints a URL → send it to testers → they open it on
  Android, allow "install unknown apps", install.
- Testers need **no Expo account and no USB**.

Subsequent updates:
```bash
# JS-only change? Instant OTA to everyone with the app:
eas update --branch preview -m "fix chat + visibility"

# Native change? Rebuild:
eas build -p android --profile preview
```

## 3. iOS testers

Requires **Apple Developer Program** membership.

```bash
eas build -p ios --profile production   # IPA, signed for TestFlight
eas submit -p ios --latest              # uploads to App Store Connect
```

Then in App Store Connect → TestFlight → add internal testers by email.
They install TestFlight from the App Store and get your build.

> First iOS build needs certificates/credentials — EAS handles them
> interactively (`eas credentials`) if you have a Mac; without a Mac,
> use `--non-interactive` with App Store Connect API keys.

## 4. Closed-app messaging (push when app is killed)

Already implemented in this codebase — nothing to "enable":

1. **Tokens**: app registers an Expo push token on login → stored in
   `users/{uid}.pushTokens` (`pushService.ts`).
2. **Trigger**: Cloud Function `onNewChatMessage`
   (`functions/src/index.ts`) fires on every new chat message,
   looks up the recipient's tokens, POSTs to the **Expo push API**
   (`exp.host/--/api/v2/push/send`) — free, works with app killed,
   shows in system tray.
3. **Foreground taps**: handled by existing notification listeners;
   tapping routes to `/chat`.

Deploy it:

```bash
firebase deploy --only functions
firebase functions:log          # verify delivery logs
```

Test with two accounts: kill app A completely, message from B → A gets
a system notification.

### Android notification channel
`pushService.ensureAndroidChannel()` creates the `messages` channel —
the function sends `channelId: "messages"`, matching it. No action.

### iOS caveat
Push on iOS needs APNs credentials tied to your Apple account
(`eas credentials -p ios` → push key). Skip until you set up TestFlight.

## 5. What Firebase Blaze gives this project (and what we use)

| Feature | Used for | Cost at demo scale |
|---|---|---|
| **Cloud Functions v2** | `onNewChatMessage` push trigger | free tier (2M invocations/mo) |
| **Cloud Firestore** | all data | free tiers (50K reads / 20K writes daily) |
| **Auth** | email+Google sign-in | free unlimited |
| **Rules + Indexes deploys** | security model | free |
| Budget alert ($5) + Functions spend cap | safety net | $0 unless breached |

Supabase side: Edge Functions (chat LLM proxy, eSewa signing, doc
signing) free tier; storage 1 GB. Nothing here bills at demo traffic.

## 6. Pre-release checklist (do ONCE before first external build)

1. [ ] `app.json`: real `android.package` + `ios.bundleIdentifier`,
      name/version.
2. [ ] `.env`: remove `SUPABASE_SERVICE_ROLE_KEY` from any env used by
      EAS build profiles that ship to testers (it's script-only; keep
      it out of `EXPO_PUBLIC_*` entirely).
3. [ ] Firestore rules deployed (`npm run deploy:rules`) — ✅ current.
4. [ ] Edge functions deployed (`--no-verify-jwt`) — ✅ current.
5. [ ] Storage migration `016` applied in Supabase SQL editor.
6. [ ] `npm run backfill:has-availability -- --write` (one-off, after
      rules deploy) so existing tutors appear/disappear correctly.
7. [ ] Smoke: `npm run test:rules` green.

## 7. Release flow summary

```
git commit → CI green (GitHub Actions)
    ↓
eas build (preview APK for testers  /  production for stores)
    ↓
eas update for JS-only hotfixes (minutes, no reinstall)
    ↓
eas submit (store/TestFlight) when ready for public
```

Keep `Documentation/01-Architecture/ARCHITECTURE.md` §0 updated when a
new paid-tier dependency appears (zero-cost rule).
