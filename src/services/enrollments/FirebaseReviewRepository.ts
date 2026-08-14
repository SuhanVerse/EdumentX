/**
 * EdumentX — Firebase Review Repository
 *
 * Concrete `ReviewRepository` over `@react-native-firebase/firestore`.
 * Mirrors the rule at
 * `match /reviews/{tutorUid}/reviews/{reviewId}`.
 */

import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  deleteDoc,
  where,
  type Unsubscribe,
} from "@react-native-firebase/firestore";

import type { Review } from "@/lib/tutor/types";
import type {
  ReviewRepository,
  SubmitReviewInput,
} from "@/services/enrollments/ReviewRepository";

/** Sub-axes we aggregate. Mirrors `CategoryRatings` from the
 *  tutor domain. */
const CATEGORY_KEYS = [
  "teaching",
  "punctuality",
  "communication",
  "knowledge",
  "overall",
] as const;

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : 0;
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 5) return 5;
  return n;
}

function mapReviewDoc(
  id: string,
  raw: Record<string, unknown>,
): Review {
  return {
    id,
    reviewerName: typeof raw.studentName === "string" ? raw.studentName : "",
    reviewerAvatar:
      typeof raw.studentAvatar === "string" ? raw.studentAvatar : null,
    verified: raw.verified === true,
    rating: clampScore(raw.score),
    timestamp: formatTimestamp(raw.createdAt),
    comment: typeof raw.comment === "string" ? raw.comment : "",
  };
}

function formatTimestamp(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return "";
    }
  }
  return "";
}

export const FirebaseReviewRepository: ReviewRepository = {
  subscribeReviews(
    tutorUid: string,
    onData: (reviews: Review[]) => void,
    onError?: (err: Error) => void,
  ): Unsubscribe {
    const db = getFirestore(getApp());
    // 4-arg form — same path semantics as enrollmentRequests.
    const q = query(collection(db, "reviews", tutorUid, "reviews"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Review[] = snap.docs.map((d) =>
          mapReviewDoc(d.id, d.data() as Record<string, unknown>),
        );
        list.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
        onData(list);
      },
      (err) => {
        console.warn("FirebaseReviewRepository.subscribeReviews", err);
        onError?.(err);
      },
    );
    return unsub;
  },

  async submitReview(input: SubmitReviewInput) {
    const db = getFirestore(getApp());
    const profileRef = doc(db, "users", input.tutorUid, "tutorProfile", "default");
    const reviewRef = doc(collection(db, "reviews", input.tutorUid, "reviews"));
    const reviewId = reviewRef.id;

    await runTransaction(db, async (tx) => {
      const profileSnap = await tx.get(profileRef);
      const profileData = (profileSnap.data() ?? {}) as Record<string, unknown>;

      const oldRating = clampScore(profileData.rating);
      const oldCount =
        typeof profileData.reviewCount === "number"
          ? profileData.reviewCount
          : 0;
      const newCount = oldCount + 1;
      const newRating = (oldRating * oldCount + input.score) / newCount;

      // Re-derive category averages from the stored running sum.
      const oldCategory = (profileData.categoryRatings ?? {}) as Record<
        string,
        unknown
      >;
      const categoryPatch: Record<string, number> = {};
      for (const key of CATEGORY_KEYS) {
        const prevSumRaw = oldCategory[key];
        const prevAvgRaw = oldCategory[key]; // stored as the running average
        // New average = (oldAvg * oldCount + newScore) / newCount
        const prevAvg =
          typeof prevAvgRaw === "number" && oldCount > 0 ? prevAvgRaw : 0;
        categoryPatch[key] =
          (prevAvg * oldCount + clampScore((input.categoryRatings as Record<string, unknown>)[key])) /
          newCount;
      }

      // Update the star breakdown
      const oldBreakdown = (profileData.reviewBreakdown ?? {}) as Record<
        string,
        unknown
      >;
      const breakdownPatch: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (let star = 1; star <= 5; star++) {
        const prev =
          typeof oldBreakdown[String(star)] === "number"
            ? (oldBreakdown[String(star)] as number)
            : 0;
        breakdownPatch[star] = prev + (Math.round(input.score) === star ? 1 : 0);
      }

      // Write the review
      tx.set(reviewRef, {
        reviewId,
        tutorUid: input.tutorUid,
        studentUid: input.studentUid,
        studentName: input.studentName,
        studentAvatar: input.studentAvatar,
        score: input.score,
        categoryRatings: input.categoryRatings,
        comment: input.comment,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update the profile with the new aggregates
      tx.update(profileRef, {
        rating: newRating,
        reviewCount: newCount,
        categoryRatings: categoryPatch,
        reviewBreakdown: breakdownPatch,
        updatedAt: serverTimestamp(),
      });
    });

    return { reviewId };
  },

  async deleteReview(reviewId, actorUid, isAdmin) {
    const db = getFirestore(getApp());
    // We need to find the review doc to learn its tutorUid. We do a
    // collectionGroup query scoped to the reviewId and the actor
    // (the rule allows delete only when the actor matches the
    // doc.studentUid or is an admin).
    // Simpler path: have the caller pass tutorUid. Update the
    // interface to require it — but for now we'll search across
    // tutors' reviews subcollections by studentUid.
    const q = query(
      collectionGroup(db, "reviews"),
      where("__name__", "==", reviewId),
    );
    // Fallback: scan all docs under collectionGroup("reviews") —
    // unindexed on reviewId alone but the doc id is a path segment
    // match so it's free.
    const snap = await getDocs(q);
    const reviewDoc = snap.docs[0];
    if (!reviewDoc) {
      // Try scanning wider — collectionGroup allows fetching all
      // docs; this is fine for our small dataset.
      const all = await getDocs(collectionGroup(db, "reviews"));
      const match = all.docs.find((d) => d.id === reviewId);
      if (!match) {
        throw new Error("Review not found");
      }
      // Path looks like `reviews/{tutorUid}/reviews/{reviewId}`
      const pathSegments = match.ref.path.split("/");
      const tutorUid = pathSegments[1] ?? "";
      await runTransaction(db, async (tx) => {
        const reviewData = match.data() as Record<string, unknown>;
        const profileRef = doc(db, "users", tutorUid, "tutorProfile", "default");
        const profileSnap = await tx.get(profileRef);
        const profileData = (profileSnap.data() ?? {}) as Record<string, unknown>;
        const oldRating = clampScore(profileData.rating);
        const oldCount =
          typeof profileData.reviewCount === "number"
            ? profileData.reviewCount
            : 0;
        const removedScore = clampScore(reviewData.score);
        const newCount = Math.max(0, oldCount - 1);
        const newRating =
          newCount === 0 ? 0 : (oldRating * oldCount - removedScore) / newCount;

        const oldBreakdown = (profileData.reviewBreakdown ?? {}) as Record<
          string,
          unknown
        >;
        const breakdownPatch: Record<number, number> = {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        };
        for (let star = 1; star <= 5; star++) {
          const prev =
            typeof oldBreakdown[String(star)] === "number"
              ? (oldBreakdown[String(star)] as number)
              : 0;
          breakdownPatch[star] = Math.max(
            0,
            prev - (Math.round(removedScore) === star ? 1 : 0),
          );
        }

        const oldCategory = (profileData.categoryRatings ?? {}) as Record<
          string,
          unknown
        >;
        const categoryPatch: Record<string, number> = {};
        for (const key of CATEGORY_KEYS) {
          const prevAvg =
            typeof oldCategory[key] === "number"
              ? (oldCategory[key] as number)
              : 0;
          categoryPatch[key] =
            newCount === 0
              ? 0
              : Math.max(
                  0,
                  (prevAvg * oldCount - clampScore(reviewData[key])) / newCount,
                );
        }

        tx.delete(match.ref);
        tx.update(profileRef, {
          rating: newRating,
          reviewCount: newCount,
          categoryRatings: categoryPatch,
          reviewBreakdown: breakdownPatch,
          updatedAt: serverTimestamp(),
        });
      });
      // Reference actorUid / isAdmin so the rule at the leaf can
      // authorise the delete — they're not used here in client
      // code but documenting the contract for callers.
      void actorUid;
      void isAdmin;
      return;
    }
    throw new Error("Review path resolution failed");
  },
};

export { CATEGORY_KEYS };