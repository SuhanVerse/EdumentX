# Build and deployment

First read [project setup](../03-Implementation-Guides/PROJECT_SETUP.md) and the [codebase and learning guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md).

| Page | Use it for |
|---|---|
| [Native installation](./install-guide.md) | Local Android/iOS development builds and EAS profiles |
| [Borrowed-Mac checklist](./borrowed-mac-checklist.md) | Temporary Mac/iPhone development session |
| [Deployment runbook](./DEPLOYMENT_GUIDE.md) | Owner-operated backend publication, testing and distribution |
| [eSewa operations](./esewa_integration.md) | Sandbox order verification and server-side Pro grants |

The repository needs a native development client, not Expo Go. `app.json`, `eas.json`, `firebase.json`, function source and SQL migrations define the configuration; a historical deployment note does not prove live state.

Ordinary development does not require cloud publication, seeding admins or running write-capable live smoke scripts. EAS Update is not configured. Preserve existing app identifiers and inspect ignored native projects before regeneration.
