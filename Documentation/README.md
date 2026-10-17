# EdumentX documentation

Start with the [codebase and learning guide](00-Overview/CODEBASE_AND_LEARNING_GUIDE.md). It explains the current implementation, shows where each feature lives, and gives a practical route from JavaScript basics to making a small change.

Reviewed against the working source on **17 October 2026**. Documentation review is not a native-device test or a store-readiness certification.

## Choose a starting point

| What you need | Read |
| --- | --- |
| Learn the code and build your first feature | [Codebase and learning guide](00-Overview/CODEBASE_AND_LEARNING_GUIDE.md) |
| Install dependencies and run a development client | [Project setup](03-Implementation-Guides/PROJECT_SETUP.md) |
| Understand service boundaries and dependency policy | [Architecture](01-Architecture/ARCHITECTURE.md) |
| Find colors, layout conventions, and animation helpers | [Design system](02-Design-System/README.md) |
| Understand auth/profile writes and rules | [Firebase notes](04-Firebase/phase-3-notes.md) |
| Grant or troubleshoot authorized admin access | [Admin setup](04-Firebase/adminsetup.md) |
| Build for a device | [Installation guide](05-Build-and-Deploy/install-guide.md) |
| Prepare release artifacts and identify external blockers | [Deployment guide](05-Build-and-Deploy/DEPLOYMENT_GUIDE.md) |
| Understand the eSewa demonstration | [Sandbox integration](05-Build-and-Deploy/esewa_integration.md) |
| Follow advanced feature boundaries | [Advanced features](04-Advanced-Features.md) |
| Diagnose dependency or working-tree issues | [Troubleshooting](03-Implementation-Guides/DEPENDENCY_AND_GIT_TROUBLESHOOTING.md) |
| Prepare for the academic defense | [Viva guide](VIVA_GUIDE.md), a dated historical study resource |
| See what was removed and how to recover it | [Documentation maintenance](MAINTENANCE.md) |

## Organization

```text
00-Overview/               Main learning guide and preserved team log
01-Architecture/           Current service and cost policy
02-Design-System/          Tokens and motion references
03-Implementation-Guides/  Setup and troubleshooting
04-Firebase/               Authentication, rules, and admin operations
05-Build-and-Deploy/       Native builds, release preparation, sandbox payments
07-Design-Context/         Original design references and attribution
97-Educational_Contents/   Original academic reports, slides, templates, and sources
98-Reference-BasoBas/      Reference project; not EdumentX application code
99-Archive/                Clerk-revert history required by project instructions
```

## How to keep these docs useful

Use implementation files, tests, and configuration as evidence. A dated report, completed checkbox, source comment, or old screenshot is not proof of current behavior or a deployed backend.

Maintain one explanation of each topic. Add a short link to it from another guide instead of another full copy. Update the feature's learning-guide entry when its path or behavior changes.

Keep historical material labeled. The [team log](00-Overview/LOG.md), [viva notes](VIVA_GUIDE.md), academic reports, and external reference apps preserve context; they do not override the current source or [AGENTS.md](../AGENTS.md).

Separate safe local checks from privileged operations. Do not turn an onboarding guide into an automatic deployment, account-deletion, or production-seeding recipe.
