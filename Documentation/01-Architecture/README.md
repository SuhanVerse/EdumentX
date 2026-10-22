# Architecture

[ARCHITECTURE.md](ARCHITECTURE.md) defines the service boundaries and the project's dependency/cost policy. Its section 0 is the place to justify a new service or dependency before introducing it.

The [approved Android/native Swift split](./2026-10-21-ANDROID-SWIFT-SPLIT-DESIGN.md) maps a separate xtool iOS client, shared backend contracts and Android-only cutover. The independent trial repository is at `~/Projects/EdumentX-iOS`; its native SDK/device gates remain pending, so the current app keeps its existing iOS target.

For detailed code traces, schemas, and learning exercises, use the [codebase and learning guide](../00-Overview/CODEBASE_AND_LEARNING_GUIDE.md). Older alternative-stack proposals and duplicate overviews have been removed from the active tree; see the [cleanup record](../MAINTENANCE.md).
