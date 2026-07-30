# `lib/mock/` — Mock tutor dataset

This directory holds the in-memory tutor dataset used when
`EXPO_PUBLIC_USE_MOCK_DATA=true` is set in `.env` (or simply used
directly by `StudentHome`, `TutorDetailsScreen`, and the mock chat
service for local development).

## Files

| File | Purpose |
|---|---|
| `tutors.ts` | The 30-tutor hand-crafted dataset + `formatNpr` helper. Each entry conforms to the canonical `TutorProfile` shape from `lib/tutor/types.ts`. |
| `README.md` | This file. |

## Canonical type

Every entry in `MOCK_TUTORS` is a full `TutorProfile`, not a slimmed
"Tutor" subset. The canonical type is the single source of truth for
all tutor-shaped data in the app:

```ts
import type { TutorProfile } from "@/lib/tutor/types";
export const MOCK_TUTORS: readonly TutorProfile[] = [ ... ];
```

This means there is no parallel `Tutor` type, no shape mismatch
between mock and live data, and no need for a `seedProfile.ts`
adapter. Consumers (StudentHome, TutorDetailsScreen, mockChatService)
read `TutorProfile` directly.

## Language defaulting rule

The `languages` field is **required** to be a non-empty array on every
tutor in the dataset. The mock represents the post-migration state
where every profile has had its languages captured.

When the live path (`FirebaseTutorRepository` reading from Firestore)
encounters a tutor doc that predates the migration and lacks the
field, the mappers in `lib/tutor/firestoreTutorService.ts` default
`languages` to `["English", "Nepali"]`. The mock chat's language
filter treats an empty `languages` array as "unknown" and skips the
filter for that tutor rather than rejecting them.

## Avatar fallback

Every tutor has a stable Pravatar URL: `https://i.pravatar.cc/150?u=<uid>`.
Pravatar is a free CDN with stable per-uid images. If offline, the
`<Avatar>` component (`components/ui/Avatar.tsx`) renders a fallback
initial-letter so the UI never shows a broken image.

## Coverage

`MOCK_TUTORS_COUNTS` (exported from `tutors.ts`) reports static
counts of the dataset so the verification checklist can assert
expected distributions. Run `console.log(MOCK_TUTORS_COUNTS)` from
anywhere to inspect.

Target distribution (per plan §5):
- 30 total tutors
- Gender split: 18 male / 8 female / 4 other
- Verified split: 24 verified / 6 unverified
- Modes: 8 home / 6 online / 16 both
- Languages: 10 English-only / 4 Nepali-only / 12 English+Nepali /
  3 Nepali+Hindi / 1 English+Hindi
- Budgets: 3,000 / 5,000 / 7,000 / 10,000 / 15,000 NPR
- Experience: 0 / 2 / 5 / 8 / 12 years

## Switching back to Firebase

The Firebase path is the default (`EXPO_PUBLIC_USE_MOCK_DATA` unset or
`=false`). To restore live data, edit `.env`:

```bash
# .env
EXPO_PUBLIC_USE_MOCK_DATA=false  # or omit entirely
```

Restart the Expo dev client. The repository is selected by
`services/tutors/dataSource.ts` at module load — there is no in-app
toggle, no Zustand flag.