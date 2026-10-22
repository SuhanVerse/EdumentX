# Your next release steps

**Next: choose the app identifiers and Apple developer team, then connect a test phone.** The Apple SDK is installed; you do not need to download Xcode again.

The unsigned Swift app builds on Ubuntu. Firebase Core, Auth and Firestore also compile and link in separate trials. The full iOS app, live integrations, signing and store release still need engineering work.

## 1. Confirm ownership and product choices

Send the coding agent these **non-secret** choices:

- Your Apple developer team and intended iOS bundle identifier. The current Swift trial uses `com.example.EdumentXiOS`; the agent must replace this placeholder before signing or registering the app. Confirm the Android package too, especially if already registered.
- Which Firebase/Supabase projects will serve production, your public support email and the domain for privacy/deletion pages.
- Intended user ages and guardian involvement; what account deletion removes or retains; who handles reports and blocks.
- Whether the first release will be free. Sandbox payments remain disabled in production.

The agent can apply the configuration and implement the agreed behavior. Keep passwords, API keys, signing files and recovery codes out of chat and Git.

## 2. Sign in privately and connect your iPhone

**Wait until the agent has configured your chosen bundle identifier.** Then run locally:

```bash
cd "$HOME/Projects/EdumentX-iOS"
xtool auth login
```

Complete your own Apple login, two-factor authentication and team selection in the interactive tool. Connect and unlock the iPhone, accept **Trust This Computer**, and enable [Developer Mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device).

Tell the agent when the phone is connected and authorized. The next `xtool dev` step contacts Apple and can register signing resources, the app and device. The agent can help build/install and collect logs; you handle private prompts and physical interactions.

For Android, connect an unlocked phone, enable USB debugging and accept its computer authorization prompt.

## 3. Check the app on real devices

Complete sign-in and system permission prompts yourself. Report visible problems with a screenshot or short description, device model and OS version. The agent handles repeatable tests, logs, code fixes and remaining implementation.

Review actual privacy text, screenshots and store disclosures after the corresponding features work. Complete store-account verification and approve the final submission when tested release candidates are ready. The selected xtool version's App Store distribution route remains unverified.

## Where everything lives

- [EdumentX-Android](https://github.com/SuhanVerse/EdumentX-Android): Android app and shared backend. The existing local folder stays `/media/xlegion/Win/PROJECTS/EdumentX`.
- [EdumentX-iOS](https://github.com/SuhanVerse/EdumentX-iOS): native Swift app, locally at `~/Projects/EdumentX-iOS`.
- [iOS setup details](https://github.com/SuhanVerse/EdumentX-iOS/blob/main/Documentation/SETUP.md): commands and toolchain limits.
- [Release readiness](PRODUCTION_READINESS.md): remaining engineering and release checks.
