# Build and install the native app

Repository configuration checked 2026-10-17. Follow [project setup](../03-Implementation-Guides/PROJECT_SETUP.md) first; the [codebase guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) explains what the app connects to.

EdumentX uses Expo SDK 54, React Native 0.81, native Firebase, Google Sign-In and `expo-maps`. Use a development build; Expo Go does not contain this project's native modules. See Expo's [development-build guide](https://docs.expo.dev/develop/development-builds/introduction/).

## Local development

Run `nvm use` to select the repository's pinned Node 24, then use the locked dependencies (`npm ci`). The root engine minimum alone is insufficient for every currently locked tool dependency. Android needs its SDK/emulator or a USB-debuggable device. Local iOS builds need macOS, Xcode and CocoaPods compatible with this Expo SDK and target device; check [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/) for toolchain selection.

From the repository root, choose your platform:

```bash
npm run android
npm run ios
```

For a physical device, select it explicitly:

```bash
npm run android -- --device
npm run ios -- --device
```

After installing a compatible development client, the daily JavaScript loop is:

```bash
npx expo start --dev-client
```

Rebuild after native dependency, plugin or native configuration changes. Restart Metro after changing bundled environment values. A development client needs a reachable Metro server for this workflow.

## Native configuration and local changes

`app.json` points to root `google-services.json` and `GoogleService-Info.plist`; obtain matching files from the owner if missing. Preserve `com.anonymous.edumentx` unless carrying out a coordinated identifier migration. Match Android signing fingerprints and the iOS Google URL scheme to their Firebase/OAuth registrations.

`android/` and `ios/` are ignored by Git, but they may already exist and contain local native changes. `expo run:*` generates missing native projects and otherwise reuses them. Inspect and back up existing directories before regeneration; **do not blindly delete them or run `prebuild --clean`**. Port intentional native edits into config plugins where practical.

Android maps use the restricted `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; iOS maps use Apple Maps. Build environments need the selected public app values. Service-account JSON, service-role keys, storage signing secrets and Groq/HF credentials belong outside the app bundle. Never add public LLM keys. Mock mode replaces selected data repositories; it does not remove the native Firebase build requirement.

## Cloud builds and tester installs

The existing EAS project ID is in `app.json`; do not reinitialize the project. With authorized Expo access, use the profiles already in `eas.json`:

```bash
eas build --platform android --profile development
eas build --platform ios --profile development
eas build --platform android --profile preview
```

`development` includes the development client and internal distribution. `preview` uses internal distribution without `developmentClient: true`; use its Android artifact for tester installs without Metro. iOS internal distribution requires suitable signing/provisioning and registered devices; the current profiles do not request an iOS simulator build. See [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/).

Local Xcode device testing can use the available personal-team capabilities; EAS iPhone distribution needs the appropriate paid Apple membership. Confirm [Apple membership capabilities](https://developer.apple.com/help/account/basics/about-your-developer-account) before scheduling a demo. Use the [borrowed-Mac checklist](./borrowed-mac-checklist.md) for a temporary development machine.

## Diagnose before regenerating

| Symptom | First check |
|---|---|
| Native module missing | Installed binary predates a native dependency/config change |
| Google Sign-In fails | Service files, web OAuth client ID, signing fingerprints/URL scheme |
| App opens but cannot load JS | Metro running and reachable from the device |
| Blank Android map | Restricted Maps key, manifest injection and enabled SDK |
| iOS compile/signing failure | Selected Xcode/device compatibility, pods, team and provisioning |
| Live chat or upload fails | Firebase session, Edge Function deployment/logs and server secrets |

For release builds, backend publication and push testing, continue to the [deployment runbook](./DEPLOYMENT_GUIDE.md). EAS Update/OTA is not configured in this repository.
