# Borrowed Mac and iPhone checklist

For a temporary **development build** session. Read [project setup](../03-Implementation-Guides/PROJECT_SETUP.md) and [native installation](./install-guide.md) first; use the [codebase guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) to choose demo flows.

## Before the session

- [ ] Agree on the commit/branch, device and signing account with the machine owner.
- [ ] Make the source available through an authorized clone or local transfer. Include any intentional changes in ignored native directories separately; a clone will not contain them.
- [ ] Prepare only the public application configuration needed by the build. Do not copy the full working `.env`, service-account JSON, service-role keys or provider credentials onto a borrowed machine.
- [ ] Confirm Xcode supports the installed iOS device and is compatible with the project's Expo SDK. Check [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/); do not choose a historical Xcode version from an old checklist.

## Prepare the Mac

- [ ] Open Xcode, complete component/license setup and select its command-line tools.
- [ ] Use `nvm use` with the repository's pinned Node 24, and install compatible CocoaPods.
- [ ] Clone/open the intended checkout, run `npm ci`, and create a minimal local `.env` from `.env.example` with the owner's public values.
- [ ] Confirm root `GoogleService-Info.plist` matches the intended Firebase iOS app and `app.json` identifier.
- [ ] Inspect existing `ios/` changes before any native regeneration. Do not delete the folder or run `prebuild --clean` automatically.

## Build and connect

- [ ] Connect the iPhone, trust the computer and enable Developer Mode if required by the device.
- [ ] Use an authorized signing team in Xcode. A personal team has capability/provisioning limits; confirm [Apple account capabilities](https://developer.apple.com/help/account/basics/about-your-developer-account) and test the actual expiry before relying on it for a demo.
- [ ] Run `npm run ios -- --device` from the project root. Open the generated `.xcworkspace` in Xcode if signing needs attention.
- [ ] Start/reconnect Metro with `npx expo start --dev-client`; ensure the phone can reach the Mac.

## Exercise the build

- [ ] Email signup, inbox verification and returning login work; Google sign-in uses the intended OAuth configuration.
- [ ] Student/tutor routing and profile saving work with the intended backend.
- [ ] Maps, request/enrollment flow and chat work. AI requests go through authenticated Edge Functions; no device-side LLM secret is needed.
- [ ] Test push separately with valid delivery credentials and permissions. A successful local install alone does not prove remote notifications work.

## Before returning the machine

- [ ] Preserve useful logs and any intentional native changes without capturing secrets.
- [ ] Remove the temporary app configuration and transferred credentials; sign out of personal development accounts as agreed with the owner.
- [ ] Record which binary/device was tested and when signing expires. Rebuild/re-sign before that expiry if the demo needs it.

For shareable tester artifacts or store distribution, use the [deployment runbook](./DEPLOYMENT_GUIDE.md). An installed development client still depends on reachable Metro in this workflow.
