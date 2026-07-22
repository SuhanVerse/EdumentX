/**
 * EdumentX — Firestore Tutor Service
 *
 * Single source of truth for reading tutor data from Firestore for
 * student-facing surfaces (StudentHome, TutorDetailsScreen, etc.).
 *
 * Two read paths:
 *   1. **List** — queries the denormalized `tutors/{uid}` collection
 *      (populated by the admin queue on approval). Used by StudentHome.
 *   2. **Detail** — reads directly from `users/{uid}/tutorProfile/default`
 *      subcollection so the full profile (including `documents` array
 *      with demo video) is available.
 *
 * Both collections are readable by any signed-in user per the
 * Firestore security rules.
 *
 * Phase 2+: add ranking, location-based filtering, and pagination.
 */

import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "@react-native-firebase/firestore";

import { getVerificationDocPublicUrl } from "@/services/supabase/storage";
import type { TutorDocument } from "@/lib/verification/documents";
import { createDefaultTutorProfile, type TutorProfile } from "@/lib/tutor/types";

// ─── Types ───────────────────────────────────────────────────────────────────

/** The shape stored on the `tutors/{uid}` doc. Subset of TutorProfile —
 *  enough for the card view, not the full detail page. */
export type TutorListing = {
  uid: string;
  fullName: string;
  username: string;
  headline: string;
  subjects: string[];
  monthlyRateNpr: number;
  location: { neighborhood: string; city: string };
  photoUrl: string | null;
  verificationStatus: string;
  isVerifiedProfessional: boolean;
  hasPendingUpdate: boolean;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
};

// ─── List subscription ───────────────────────────────────────────────────────

const DEFAULT_TUTOR_LISTING: TutorListing = {
  uid: "",
  fullName: "",
  username: "",
  headline: "",
  subjects: [],
  monthlyRateNpr: 0,
  location: { neighborhood: "", city: "" },
  photoUrl: null,
  verificationStatus: "pending",
  isVerifiedProfessional: false,
  hasPendingUpdate: false,
  rating: 0,
  reviewCount: 0,
  yearsExperience: 0,
};

/**
 * Subscribe to the list of discoverable tutors. Only returns tutors
 * who are `verificationStatus === "approved"` AND
 * `hasPendingUpdate === false` — matching the filter in
 * `lib/verification/discovery.ts`.
 *
 * The callback fires immediately with the current snapshot and again
 * on every Firestore change.
 *
 * Returns an unsubscribe function. Call it in the useEffect cleanup.
 */
export function subscribeTutors(
  onData: (tutors: TutorListing[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const db = getFirestore(getApp());
  const tutorsRef = collection(db, "tutors");
  const q = query(
    tutorsRef,
    where("verificationStatus", "==", "approved"),
    where("hasPendingUpdate", "==", false),
  );

  return onSnapshot(
    q,
    (snap) => {
      const tutors: TutorListing[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const rawLocation = data.location as
          | { neighborhood?: string; city?: string }
          | null
          | undefined;
        return {
          ...DEFAULT_TUTOR_LISTING,
          uid: d.id,
          fullName: typeof data.fullName === "string" ? data.fullName : "",
          username: typeof data.username === "string" ? data.username : "",
          headline: typeof data.headline === "string" ? data.headline : "",
          subjects: Array.isArray(data.subjects) ? (data.subjects as string[]) : [],
          monthlyRateNpr:
            typeof data.monthlyRateNpr === "number" ? data.monthlyRateNpr : 0,
          location: {
            neighborhood:
              typeof rawLocation?.neighborhood === "string"
                ? rawLocation.neighborhood
                : "",
            city:
              typeof rawLocation?.city === "string" ? rawLocation.city : "",
          },
          photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
          verificationStatus:
            typeof data.verificationStatus === "string"
              ? data.verificationStatus
              : "pending",
          isVerifiedProfessional: data.isVerifiedProfessional === true,
          hasPendingUpdate: data.hasPendingUpdate === true,
          rating: typeof data.rating === "number" ? data.rating : 0,
          reviewCount: typeof data.reviewCount === "number" ? data.reviewCount : 0,
          yearsExperience:
            typeof data.yearsExperience === "number" ? data.yearsExperience : 0,
        };
      });
      onData(tutors);
    },
    (err) => {
      console.warn("[firestoreTutorService] subscribeTutors error", err);
      onError?.(err);
    },
  );
}

// ─── Single tutor profile (detail page) ──────────────────────────────────────

/**
 * Fetch a single tutor's full profile from Firestore.
 *
 * **Path 1 — `tutors/{uid}` (always tried first):**
 * The denormalized tutor directory is the student-facing source of
 * truth. If a tutor appears on the home screen, their doc exists here.
 * This path is the most reliable — it always returns a usable profile
 * (with fewer fields, no bio/documents/demo video).
 *
 * **Path 2 — `users/{uid}/tutorProfile/default` (enhancement):**
 * If the profile subcollection doc exists (richer data including bio,
 * phone, documents array with demo video), we prefer it over the
 * directory entry. This doc is created during the tutor onboarding
 * flow.
 *
 * **Path 3 — `users/{uid}` root (last resort):**
 * If both above fail, read the root user doc which always exists
 * for any signed-up user. Gives at least identity fields.
 *
 * Why this order? The old code had `users/{uid}/tutorProfile/default`
 * as the primary path and `tutors/{uid}` as the fallback. That broke
 * when the subcollection doc didn't exist (e.g. onboarding incomplete)
 * or when the subcollection read threw an unexpected error, because
 * both paths could fail. Since `tutors/{uid}` is what powers the
 * student home screen, it's guaranteed to exist for visible tutors
 * and should be the primary read path for student-facing screens.
 */
export async function fetchTutorProfile(uid: string): Promise<TutorProfile | null> {
  // Guard: empty or invalid uid.
  if (!uid || typeof uid !== "string" || uid.trim().length === 0) {
    console.warn(
      "[firestoreTutorService] fetchTutorProfile called with invalid uid:",
      uid,
    );
    return null;
  }

  const db = getFirestore(getApp());
  console.log(
    `[firestoreTutorService] fetchTutorProfile("${uid}") — starting`,
  );

  // ── Path 1: tutors/{uid} (most reliable) ──
  try {
    const tutorRef = doc(db, "tutors", uid);
    const snap = await getDoc(tutorRef);

    const data = snap.data() as Record<string, unknown> | undefined;
    if (data != null) {
      console.log(
        `[firestoreTutorService] ✅ tutors/${uid} found — keys: ${Object.keys(data).join(", ")}`,
      );

      // Try to enhance with richer profile subcollection data.
      const enhanced = await tryEnhanceFromProfile(db, uid, data);
      return enhanced;
    }
    console.warn(
      `[firestoreTutorService] ❌ tutors/${uid} — does not exist`,
    );
  } catch (err) {
    console.warn(
      `[firestoreTutorService] ❌ tutors/${uid} — getDoc threw: `,
      err,
    );
  }

  // ── Path 2: users/{uid}/tutorProfile/default (richer data) ──
  try {
    const profileRef = doc(db, "users", uid, "tutorProfile", "default");
    const snap = await getDoc(profileRef);

    const data = snap.data() as Record<string, unknown> | undefined;
    if (data != null) {
      console.log(
        `[firestoreTutorService] ✅ users/${uid}/tutorProfile/default found`,
      );
      return profileDocToTutorProfile(uid, data);
    }
    console.warn(
      `[firestoreTutorService] ❌ users/${uid}/tutorProfile/default — does not exist`,
    );
  } catch (err) {
    console.warn(
      `[firestoreTutorService] ❌ users/${uid}/tutorProfile/default — getDoc threw: `,
      err,
    );
  }

  // ── Path 3: users/{uid} root (last resort) ──
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    const data = snap.data() as Record<string, unknown> | undefined;
    if (data != null) {
      console.log(
        `[firestoreTutorService] ✅ users/${uid} root found, returning minimal`,
      );
      return createDefaultTutorProfile({
        id: uid,
        fullName: (data.fullName as string) ?? (data.displayName as string) ?? "",
        email: (data.email as string) ?? "",
        phone: (data.phone as string) ?? "",
        photoUrl: (data.photoUrl as string) ?? null,
      });
    }
    console.warn(
      `[firestoreTutorService] ❌ users/${uid} root — does not exist (orphaned)`,
    );
  } catch (err) {
    console.warn(
      `[firestoreTutorService] ❌ users/${uid} root — getDoc threw: `,
      err,
    );
  }

  console.warn(
    `[firestoreTutorService] ❌❌❌ ALL PATHS FAILED for "${uid}".`,
  );
  return null;
}

/**
 * Given data from a `tutors/{uid}` doc, try to enhance it with richer
 * data from `users/{uid}/tutorProfile/default`. If the profile
 * subcollection exists, use its data instead (it has bio, phone,
 * documents with demo video, etc.). Otherwise use the directory data.
 */
async function tryEnhanceFromProfile(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  tutorDirData: Record<string, unknown>,
): Promise<TutorProfile> {
  try {
    const profileRef = doc(db, "users", uid, "tutorProfile", "default");
    const snap = await getDoc(profileRef);
    const profileData = snap.data() as Record<string, unknown> | undefined;
    if (profileData != null) {
      console.log(
        `[firestoreTutorService] ✅ Enhanced tutors/${uid} with profile subcollection`,
      );
      return profileDocToTutorProfile(uid, profileData);
    }
  } catch {
    // Non-fatal — fall through to directory data below.
  }
  // Profile subcollection doesn't exist — use the directory entry.
  return tutorsDocToTutorProfile(uid, tutorDirData);
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/**
 * Map a `users/{uid}/tutorProfile/default` doc to TutorProfile.
 * This path has the richest data including the `documents` array
 * with the demo video.
 */
function profileDocToTutorProfile(
  uid: string,
  data: Record<string, unknown>,
): TutorProfile {
  const documents = Array.isArray(data.documents)
    ? (data.documents as TutorDocument[])
    : [];

  // Extract demo video from the documents array and convert the
  // Supabase storage path to a publicly accessible URL.
  const demoVideoDoc = documents.find((d) => d.kind === "demo");
  const demoVideoUrl = demoVideoDoc?.path
    ? getVerificationDocPublicUrl(demoVideoDoc.path)
    : null;

  const rawLocation = data.location as
    | { neighborhood?: string; city?: string }
    | null
    | undefined;

  return createDefaultTutorProfile({
    id: uid,
    fullName: (data.fullName as string) ?? "",
    username: (data.username as string) ?? "",
    headline: (data.headline as string) ?? "",
    bio: (data.bio as string) ?? "",
    subjects: Array.isArray(data.subjects) ? (data.subjects as string[]) : [],
    gradesTeaching: Array.isArray(data.gradesTeaching)
      ? (data.gradesTeaching as string[])
      : [],
    yearsExperience: (data.yearsExperience as number) ?? 0,
    monthlyRateNpr: (data.monthlyRateNpr as number) ?? 0,
    location: {
      neighborhood:
        typeof rawLocation?.neighborhood === "string"
          ? rawLocation.neighborhood
          : "",
      city:
        typeof rawLocation?.city === "string" ? rawLocation.city : "",
    },
    photoUrl: (data.photoUrl as string) ?? null,
    verificationStatus:
      (data.verificationStatus as TutorProfile["verificationStatus"]) ?? "pending",
    isVerifiedProfessional: data.isVerifiedProfessional === true,
    degree: (data.degree as string) ?? "",
    institution: (data.institution as string) ?? "",
    // Demo video from the documents array
    demoVideoUrl,
    phone: (data.phone as string) ?? "",
    email: (data.email as string) ?? "",
  });
}

/**
 * Map a `tutors/{uid}` doc to TutorProfile. This is a fallback path
 * with fewer fields (no documents array, no bio, etc.).
 */
function tutorsDocToTutorProfile(
  uid: string,
  data: Record<string, unknown>,
): TutorProfile {
  const rawLocation = data.location as
    | { neighborhood?: string; city?: string }
    | null
    | undefined;

  return createDefaultTutorProfile({
    id: uid,
    fullName: (data.fullName as string) ?? "",
    username: (data.username as string) ?? "",
    headline: (data.headline as string) ?? "",
    subjects: Array.isArray(data.subjects) ? (data.subjects as string[]) : [],
    monthlyRateNpr: (data.monthlyRateNpr as number) ?? 0,
    location: {
      neighborhood:
        typeof rawLocation?.neighborhood === "string"
          ? rawLocation.neighborhood
          : "",
      city:
        typeof rawLocation?.city === "string" ? rawLocation.city : "",
    },
    photoUrl: (data.photoUrl as string) ?? null,
    // Demo video — the directory doc may store a public URL or a
    // storage path. If it's a relative path, convert it.
    demoVideoUrl:
      typeof data.demoVideoUrl === "string" && data.demoVideoUrl.length > 0
        ? data.demoVideoUrl.startsWith("http")
          ? (data.demoVideoUrl as string)
          : getVerificationDocPublicUrl(data.demoVideoUrl as string)
        : null,
    verificationStatus:
      (data.verificationStatus as TutorProfile["verificationStatus"]) ?? "pending",
    isVerifiedProfessional: data.isVerifiedProfessional === true,
  });
}
