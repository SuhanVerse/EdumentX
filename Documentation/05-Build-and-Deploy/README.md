# Build and deployment

First read [project setup](../03-Implementation-Guides/PROJECT_SETUP.md) and the [codebase and learning guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md).

| Page | Use it for |
|---|---|
| [Owner-only steps](./PERSONAL_RELEASE_STEPS.md) | Apple archive/accounts, product-policy decisions, private credentials, physical-device prompts and final approval |
| [Production release guide](./PRODUCTION_RELEASE_GUIDE.md) | Detailed Ubuntu Android APK/AAB and remote-macOS iOS build, signing, submission, and staged-release commands |
| [iOS on Linux and xtool](./IOS_ON_LINUX_XTOOL.md) | Actual Ubuntu tool setup, SwiftPM lab, and the boundary between xtool and EdumentX's React Native build |
| [Production readiness](./PRODUCTION_READINESS.md) | Prioritized security, privacy, account lifecycle, reliability, and premium-quality work before release |
| [Native installation](./install-guide.md) | Local Android/iOS development builds and EAS profiles |
| [Borrowed-Mac checklist](./borrowed-mac-checklist.md) | Temporary Mac/iPhone development session |
| [Deployment runbook](./DEPLOYMENT_GUIDE.md) | Owner-operated backend publication, testing and distribution |
| [eSewa operations](./esewa_integration.md) | Sandbox order verification and server-side Pro grants |

The repository needs a native development client, not Expo Go. `app.json`, `eas.json`, `firebase.json`, function source and SQL migrations define the configuration; a historical deployment note does not prove live state.

The separate native Swift/xtool trial now lives at `~/Projects/EdumentX-iOS` (local repository, no remote publication). Its README, setup and learning guides cover that client. The [approved split](../01-Architecture/2026-10-21-ANDROID-SWIFT-SPLIT-DESIGN.md) keeps this app's legacy iOS target until native feasibility and cross-client integration are proven; the Swift trial is not yet a full iOS replacement.

Ordinary development does not require cloud publication, seeding admins or running write-capable live smoke scripts. EAS Update is not configured. Preserve existing app identifiers and inspect ignored native projects before regeneration.

Run `npm run verify:local` for the fixed local source, helper and demo-emulator checks plus the separate Swift core when present. Sanitized evidence is written to `.expo/release-check/latest.json`; native/device/live/store results remain pending. Failed steps can be rerun by their named npm script for normal diagnostics. This command installs nothing and publishes nothing.
