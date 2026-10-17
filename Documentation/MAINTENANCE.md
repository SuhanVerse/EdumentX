# Documentation maintenance and recovery

Prepared on **17 October 2026** from a source and documentation review. The purpose is to provide one useful implementation/learning entry point and remove repeated or misleading setup instructions.

## Current reading order

1. [Codebase and learning guide](00-Overview/CODEBASE_AND_LEARNING_GUIDE.md).
2. [Project setup](03-Implementation-Guides/PROJECT_SETUP.md).
3. [Architecture and dependency policy](01-Architecture/ARCHITECTURE.md).
4. The relevant Firebase or native-build runbook.

The guide explains the inspected implementation. It does not certify native builds, remote deployment state, security correctness, or store approval.

## Cleanup scope

| Material | Treatment and reason |
| --- | --- |
| Duplicate product overviews and AI design context | Replaced by the current learning guide and a small reference index |
| Initial setup, phase plans, old feature roadmaps, and dated audits | Removed from the active tree; they describe removed auth or already-shipped work |
| Master refactor prompt directing Tamagui | Removed because it contradicts current architecture |
| Notification “summary” containing a full assistant transcript | Removed; current function/client paths are documented in the guide |
| Duplicate RAG and alternative-backend proposals | Replaced by source-backed feature traces |
| Phone-auth plans and Supabase Auth migration proposal | Removed because current identity uses native Firebase email/password and Google |
| Unused web design export | Removed after preserving its two unique design PDFs and attribution under `07-Design-Context/` |
| BasoBas generated graph output | Removed; original reference source/report/attribution remain |
| macOS `__MACOSX` AppleDouble and Finder metadata | Removed; these are not application or report content |
| Duplicate report-template ZIP and proposal PDF alias | Removed only after byte-identical counterparts were confirmed |
| Team-authored `LOG.md`, viva notes, report sources/slides, original images, unique ZIP/report content | Preserved |
| Clerk-revert history referenced by AGENTS.md | Preserved as historical material |

The prepared removal manifest contains **60,704 old paths**; three are relocated unique design/attribution files, rather than discarded content. **60,323** of the removal paths are macOS AppleDouble metadata. File counts include hidden files, not just files shown by ordinary search tools.

`EdumentX_Mid_Defense.zip` is preserved: it contains a unique PDF not found in the extracted folder. Images referenced by report TeX files remain in place even when another image has the same bytes.

The BasoBas `ANALYSIS.md` named in AGENTS.md was missing before this review. A new [reference inventory](98-Reference-BasoBas/ANALYSIS.md) identifies the preserved sources and translation boundaries; it is not presented as the lost historical per-file analysis.

## Recovery copy

A complete pre-cleanup archive and SHA-256 manifest were saved outside the repository:

```text
/home/xlegion/.local/share/edumentx/documentation-backups/
  2026-10-16-20261016T162816Z/
    Documentation-before-cleanup.tar.gz
    manifest-before.json
```

All **61,183 original files** in the archive were verified against the manifest when the backup was created. The archive contains the original documentation and reference material; it does not back up the whole application.

This absolute path belongs to the local machine and is not a shared repository resource. Preserve or transfer the backup separately if historical material is needed on another machine. It may contain historical internal material and should not be published without review.

For recovery, extract selected members into a separate writable folder and compare them before copying anything into the checkout. Do not overwrite the cleaned tree merely to retrieve one old explanation.

## Preparation environment

The original Windows project volume was mounted read-only when the update was prepared, so the package was written to a separate writable directory. Its apply utility performs a full expected-hash check before changing a checkout and rejects intervening edits. It does not reset or stage Git changes.

The original team log, academic originals, and reference-app code are historical context. Keep those labels when linking them. Update implementation facts from current code instead of treating the latest-looking filename as an authority.
