# Types

Shared TypeScript types and interfaces. **All types must be exported and well-documented.**

## Folder Structure

```
types/
├── user.ts          # User, UserProfile, Role
├── tutor.ts         # Tutor, Subject, Grade
├── enrollment.ts    # Enrollment, EnrollmentRequest, EnrollmentStatus
└── common.ts        # Shared utility types (Result, ApiError, etc.)
```

## Rules

- **Use `interface` for objects, `type` for unions/aliases**
- **Export everything** — types should be consumable from anywhere
- **No runtime code** — types are erased at compile time
- **JSDoc comments** for non-obvious types
- **No circular dependencies** between type files
- **Re-export from a barrel** (`types/index.ts`) for convenience

## Pattern: Domain Type

```ts
// types/user.ts

/** The two primary user roles in the app. Admin is reserved for internal use. */
export type Role = 'student' | 'tutor' | 'admin';

/** A grade level a student can be in. */
export type Grade =
  | 'Grade 7'
  | 'Grade 8'
  | 'Grade 9'
  | 'Grade 10'
  | 'Grade XI (Science)'
  | 'Grade XI (Management)'
  | 'Grade XII (Science)'
  | 'Grade XII (Management)';

/** A subject a student needs or a tutor teaches. */
export type Subject =
  | 'Math'
  | 'Physics'
  | 'Chemistry'
  | 'Computer Science'
  | 'Biology'
  | 'Nepali'
  | 'English';

/** A user document stored in Firestore at /users/{uid}. */
export interface UserProfile {
  uid: string;
  phone: string;
  email: string;
  fullName: string;
  role: Role;
  grade?: Grade;
  subject?: Subject;
  avatarUrl?: string;
  createdAt: number;  // Unix timestamp in ms
  updatedAt: number;
}

/** Verification status for tutor accounts. */
export type VerificationStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected';

export interface TutorVerification {
  uid: string;
  status: VerificationStatus;
  documents: {
    id?: { url: string; uploadedAt: number };
    education?: { url: string; uploadedAt: number };
    address?: { url: string; uploadedAt: number };
    videoIntro?: { url: string; uploadedAt: number };
  };
  rejectionReason?: string;
  submittedAt?: number;
  reviewedAt?: number;
  reviewedBy?: string;  // Admin uid
}
```

## Pattern: API Result Type

```ts
// types/common.ts

/** A discriminated union for operations that can fail. */
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

/** A paginated list response. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** A loading state with optional data and error. */
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/** Coordinates in WGS84. */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}
```

## Pattern: Barrel Export

```ts
// types/index.ts
export * from './user';
export * from './tutor';
export * from './enrollment';
export * from './common';
```

Then consumers can do:
```ts
import type { UserProfile, Role, Grade } from '@/types';
```

## Pattern: Enum-Like Constants

For values that need runtime access (e.g., for dropdowns):

```ts
// types/tutor.ts
export const SUBJECTS = [
  'Math', 'Physics', 'Chemistry', 'Computer Science',
  'Biology', 'Nepali', 'English'
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const GRADES = [
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade XI (Science)', 'Grade XI (Management)',
  'Grade XII (Science)', 'Grade XII (Management)'
] as const;
export type Grade = (typeof GRADES)[number];
```

## Firestore Type Mapping

When storing in Firestore, follow these conventions:

| TypeScript | Firestore |
|-----------|-----------|
| `string` | string |
| `number` | number |
| `boolean` | boolean |
| `Date` | Timestamp (use `serverTimestamp()`) |
| `T \| null` | field omitted (don't store null) |
| `T[]` | array |
| `{ a: string }` | map |
| `Role` | string (e.g., "student") |

## References

- `services/firebase/firestore.ts` — uses these types
- `store/` — stores conform to these types
- `constants/theme.ts` — design tokens (separate concern)
