# Borrowed Mac + iPhone — one-page setup checklist

For when you don't own a Mac but a friend's MacBook + iPhone is available.
Full context: [`install-guide.md`](./install-guide.md) §2. Budget **1–2 hours**
(the Xcode download is the long pole). Everything below is checkbox-style;
each command runs in the project root.

## 0. Before you leave your machine
- [ ] Push your latest branch so the Mac can clone it:
      `git push origin develop` (or whatever your working branch is)
- [ ] Copy `.env` somewhere portable (USB / cloud / chat) — it is
      **gitignored** and the Mac's clone will not have it.

## 1. On the Mac — one-time tool install (terminal)
- [ ] Install Xcode 16+ from the Mac App Store (~12 GB). First launch:
      agree to the license, let components install.
- [ ] `xcode-select --install` (Command Line Tools)
- [ ] Install Node 20+: `brew install node@20` (or use nvm)
- [ ] `sudo gem install cocoapods`

## 2. Get the code
- [ ] `git clone git@github.com:SuhanVerse/EdumentX.git` (friend needs
      GitHub collaborator access for SSH; use HTTPS if the repo is public)
- [ ] `cd EdumentX && git checkout develop`
- [ ] **Copy your `.env` into the project root** (step 0) — without it the
      app has no API keys.
- [ ] Sanity check the Firebase config exists: `ls GoogleService-Info.plist`
      (tracked in git, so the clone already has it)

## 3. Install dependencies
- [ ] `npm ci`

## 4. iPhone 13 Pro — one-time device setup
- [ ] Connect via cable; on the phone tap **Trust**.
- [ ] On the phone: **Settings → Privacy & Security → Developer Mode → ON**
      → **restart**. (iOS 16+; the #1 forgotten step.)
- [ ] Xcode → **Window → Devices and Simulators** → confirm the phone shows
      up, and check "Connect via network" if you want wireless later.

## 5. Signing (free Apple ID — the friend's)
- [ ] Xcode → **Settings → Accounts** → add the friend's Apple ID
- [ ] Open `ios/EdumentX.xcworkspace` → target → **Signing & Capabilities**
      → select the personal team (free = 7-day expiry)

## 6. Build on the device
- [ ] `npx expo run:ios --device` (same Wi-Fi so Metro reaches the phone)
- [ ] First build: ~10–20 min. Then on the phone: **Settings → General →
      VPN & Device Management → Trust** the developer certificate.
- [ ] App opens → sign up / log in.

## 7. Smoke test (live mode)
- [ ] `EXPO_PUBLIC_USE_MOCK_DATA=false` in the copied `.env` → live Firestore
- [ ] Map shows tutors (Apple Maps — no API key needed on iOS)
- [ ] Google Sign-In opens the `com.googleusercontent.apps.…` flow
- [ ] AI chat replies (needs `EXPO_PUBLIC_GROQ_API_KEY` in `.env`)

## 8. Demo-day reminder
- [ ] Free signing expires after **7 days** — before a demo, re-run
      `npx expo run:ios --device` on the Mac to re-sign (takes minutes).
- [ ] If anything changed in the code: on the Mac, `git pull` + `npm ci`,
      then rebuild.

---

### If a step fails
| Symptom | Fix |
|---|---|
| `pod install` errors | `cd ios && pod install --repo-update`; confirm Xcode is up to date |
| App won't install on the phone | Developer Mode off (step 4) or cert not trusted (step 6) |
| "API key not found" on the map | Only Android — iOS uses Apple Maps; ignore |
| Chat is silent / storage empty | `.env` missing the GROQ / HF / Supabase keys — re-copy it |
| Build runs but Metro won't connect | Phone and Mac on the **same Wi-Fi**; or connect via cable + `--device` |
