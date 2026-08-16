# Installing EdumentX on iOS & Android

EdumentX is a React Native (Expo SDK 54, RN 0.81) app with **native modules**
(Firebase Auth, Google Sign-In, `expo-maps`, `react-native-view-shot` avatar
pins), so it **cannot run in Expo Go** — it needs a **development build**
(a native app compiled from this repo). iOS is the deep-dive below (it has
the extra signing/provisioning steps); Android is the quick reference in §7.

> **The one honest cost.** Everything in this project is zero-budget, but
> Apple makes device installs awkward: a **free Apple ID** works for the
> **simulator** (no signing) and for your own phone with **7-day re-signing**;
> long-lived installs, TestFlight and the App Store need the **Apple Developer
> Program ($99/year)**. There is no way around that if you want permanent
> installs on real iPhones.

---

## 0. What you need

| Requirement | Notes |
| --- | --- |
| **macOS** (any recent version) | Xcode only runs on macOS. EAS cloud builds (Option B) can be triggered from Windows/Linux. |
| **Xcode** (16.x, from the Mac App Store) | Contains the iOS SDK + simulator. First launch: agree to the license, install components. |
| **Xcode Command Line Tools** | `xcode-select --install` (usually prompted by Xcode). |
| **Node.js 20+** | Match CI: `node -v`. |
| **CocoaPods** | Ruby gem: `sudo gem install cocoapods` then `pod --version` (≥ 1.15). |
| **An Apple ID** | For signing. Free is fine for simulator + 7-day device testing. |
| **`.env` file** | Copy `.env.example` → `.env` and fill in the values (see §1). |

---

## 1. Environment & Firebase config

```bash
npm ci                      # exact lockfile install
cp .env.example .env        # then fill in your real values
```

Every `EXPO_PUBLIC_*` var is needed at **build time** (Metro inlines them).
The Firebase values must match the Firebase project used by the
`GoogleService-Info.plist` below.

**Firebase iOS config** — `GoogleService-Info.plist` **is already checked
into this repo** at the repo root (with `google-services.json` for Android),
and `app.json` wires it up:

```jsonc
// app.json (already correct — do not remove)
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.anonymous.edumentx",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "plugins": [
      // Bare string → the plugin takes the "Firebase" path and reads the
      // plist, auto-injecting the REVERSED_CLIENT_ID URL scheme. Do NOT
      // pass { iosUrlScheme } here unless you know what you're doing.
      "@react-native-google-signin/google-signin",
      ...
    ]
  }
}
```

If you fork the repo or repoint to a different Firebase project: download a
fresh `GoogleService-Info.plist` from **Firebase console → Project settings →
Your iOS app** and replace the one at the repo root, then delete the generated
`ios/` folder and prebuild again (below).

---

## 2. Option A — Local build on a Mac (recommended for development)

```bash
npx expo run:ios
```

This single command:

1. Runs **prebuild** — generates the `ios/` native project from `app.json`
   (the folder is gitignored; it does not exist in a fresh clone),
2. Runs `pod install` (CocoaPods),
3. Compiles with Xcode and **launches the iOS Simulator**.

**First build takes 5–15 minutes** (pod install + full compile). Later builds
are incremental.

The generated `ios/` folder can be regenerated at any time:

```bash
npx expo prebuild --platform ios --clean   # wipe & regenerate (safe: gitignored)
```

### Borrowing a friend's Mac + iPhone (the zero-budget path)

You don't own a Mac — a friend's MacBook + their iPhone works fine. The
setup is the same as above; the practical flow. **For a step-by-step
checklist to follow during the session, see
[`borrowed-mac-checklist.md`](./borrowed-mac-checklist.md).**

1. **Get the code onto the Mac.** Clone over HTTPS (if the repo is public)
   or over SSH after adding the friend as a collaborator:
   `git clone git@github.com:SuhanVerse/EdumentX.git`. Push your latest
   branch from your own machine first (`git push origin develop`).
   (No remote? Just copy the folder minus `node_modules` via USB/cloud.)
2. **Install on the Mac once:** Xcode 16+ (App Store, ~12 GB — the long
   pole), Command Line Tools, Node 20+, CocoaPods
   (`sudo gem install cocoapods`).
3. **Copy `.env` manually** — it's gitignored, so the clone has NO env
   vars. Copy your `.env` from your machine (USB/cloud/chat) into the
   project root on the Mac. Without it the app has no API keys.
   `GoogleService-Info.plist` is tracked, so the clone already has it.
4. **Phone setup (one time):** connect the iPhone via cable, trust it in
   Xcode (Window → Devices and Simulators), and on the phone enable
   **Settings → Privacy & Security → Developer Mode** (iOS 16+, requires
   a restart) — this is the #1 forgotten step.
5. **Signing:** in Xcode → Settings → Accounts, add the **friend's free
   Apple ID** (their Mac + their iPhone → natural). Select their personal
   team in Signing & Capabilities.
6. **Build on the device:** `npx expo run:ios --device` (same Wi-Fi so
   Metro reaches the phone). Trust the developer cert on the phone
   (Settings → VPN & Device Management).

**7-day expiry:** free signing expires weekly — before a demo, re-run
`npx expo run:ios --device` on the Mac to re-sign. That's the whole
cost of the zero-budget route.

### Running on a physical iPhone (free Apple ID)

1. Plug the phone in (or use a cable) and trust the computer.
2. In Xcode: open `ios/EdumentX.xcworkspace`, select your phone as the
   destination (Window → Devices and Simulators also works).
3. Signing: in the **Signing & Capabilities** tab, select your Team (add your
   Apple ID in *Settings → Accounts* if it isn't listed). Xcode creates a free
   **personal team**.
4. Build & Run. On the phone: **Settings → General → VPN & Device Management →
   tap your developer profile → Trust** (required once).
5. ⚠️ Free provisioning **expires after 7 days** — re-run the build to
   re-sign. This is Apple's rule for free accounts.

---

## 3. Option B — EAS cloud build (no local Xcode needed)

EAS builds the IPA on Expo's servers — useful when you don't have a Mac or
want to share an install link with teammates.

```bash
npm i -g eas-cli
eas login                       # any Expo account works
eas build --profile development --platform ios


eas build -e development -p ios --clear-cache

```

- The `development` profile (`eas.json`) produces a **dev client** — the
  same debug experience as `expo run:ios`.
- EAS asks for your Apple credentials during the first build and handles
  provisioning (it can even create a free personal team).
- When it finishes you get an install URL — open it on the iPhone to install.
- EAS **free tier** is enough for dev builds (limits are build-time/minutes,
  not per-app).

> **Why not Expo Go?** Expo Go only bundles a fixed set of modules. This app
> uses native Firebase Auth, Google Sign-In, `expo-maps` and
> `react-native-view-shot` (photo map pins) — none of which Expo Go carries.
> A dev-client build is mandatory.

---

## 4. What to expect on first launch

- **Same behavior as Android**: `EXPO_PUBLIC_USE_MOCK_DATA=false` → live
  Firestore; `true` → mock repos.
- **Maps**: `expo-maps` uses **Apple Maps on iOS — no API key needed**. The
  `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is Android-only (the
  `withGoogleMapsApiKey` config plugin injects it into the Android manifest).
- **Google Sign-In**: must open the `com.googleusercontent.apps.…` URL scheme.
  It's injected automatically at prebuild from `GoogleService-Info.plist` —
  verify in Xcode: target → **Info → URL Types** (one entry with that scheme).
- **Status bar / safe areas**: the app uses `react-native-safe-area-context`
  everywhere; the notch and home indicator are handled (see the design audit).

---

## 5. Common issues

| Symptom | Fix |
| --- | --- |
| `pod install` fails / "CocoaPods could not find compatible versions" | `sudo gem install cocoapods`, then `cd ios && pod install --repo-update`. Also confirm Xcode is the latest installed (SDK mismatches break pods). |
| "Missing `iosUrlScheme`" during prebuild | You passed `{ iosUrlScheme: … }` to the google-signin plugin. Use the bare string form (as in this repo) so it reads the plist instead. |
| Google Sign-In "no URL scheme registered" at runtime | `GoogleService-Info.plist` is missing from the repo root, or the `ios/` folder predates it — delete `ios/` and re-run `npx expo run:ios`. |
| App won't install / "unable to verify" on the phone | Free team: 7-day expiry or you didn't Trust the developer cert (Settings → VPN & Device Management). |
| Build errors mentioning missing `GoogleService-Info.plist` | Prebuild ran without the file at repo root — add it (§1), then `npx expo prebuild --platform ios --clean`. |
| "No module named X" in Metro | `npm ci` wasn't run, or you edited `package.json` — reinstall and restart Metro. |
| Weird fonts / splash colors | Not a bug — the amber/slate brand is intentional (`#E5A03B` accent, `#0F172A` night). |

---

## 6. Production: TestFlight / App Store (paid account)

Requires the **Apple Developer Program ($99/year)** and an App Store Connect
record:

```bash
eas build --profile production --platform ios   # release IPA
eas submit --platform ios                       # upload to App Store Connect
```

TestFlight distribution then works for up to 100 testers. This repo's
production profile uses `autoIncrement: true` for versioning.

---

## 7. Android install (quick reference)

Android needs no signing ceremony — the debug build is directly installable.
The `android/` folder is gitignored (generated, like `ios/`), and
`google-services.json` is already checked in.

### Local dev on a connected phone (USB debugging)

```bash
npx expo run:android
```

Builds the native project, installs the **debug APK** on the connected
device, and starts Metro. Enable *Developer options → USB debugging* on the
phone first. First build takes a few minutes; the user's dev loop is exactly
this (see the terminal logs in the repo history).

### Sharing an APK with teammates

The debug APK is signed and installable on any Android phone:

```bash
npx expo run:android                      # or just build once:
# APK lands at:
#   android/app/build/outputs/apk/debug/app-debug.apk
```

Share that file; the recipient enables *Settings → Apps → Install unknown
apps* (allow for Files/browser), taps the APK, and installs. Debug builds
show the Metro/development UI — fine for testing.

For a cleaner, optimized APK (no dev menu), use EAS:

```bash
eas build --profile preview --platform android   # shareable .apk link
```

### Android-specific notes

- **Google Maps requires a key on Android**: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
  in `.env` (the `withGoogleMapsApiKey` config plugin injects it into the
  manifest at prebuild). iOS uses Apple Maps and needs no key.
- Missing key → the map crashes at runtime with "API key not found";
  prebuild prints a warning from `withGoogleMapsApiKey`.
- Everything else (Firebase, Google Sign-In, safe areas) behaves the same as
  iOS — behavior is driven by the same `.env` flags.

---

## Quick reference

| Task | Command |
| --- | --- |
| Fresh clone + install | `npm ci && cp .env.example .env` (fill values) |
| Local iOS build (simulator) | `npx expo run:ios` |
| Regenerate iOS native project | `npx expo prebuild --platform ios --clean` |
| Pods only | `cd ios && pod install` |
| Cloud iOS dev build | `eas build --profile development --platform ios` |
| Cloud iOS release build | `eas build --profile production --platform ios` |
| Submit to App Store | `eas submit --platform ios` |
| Local Android build + install | `npx expo run:android` |
| Shareable Android debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Shareable Android build (no dev menu) | `eas build --profile preview --platform android` |
