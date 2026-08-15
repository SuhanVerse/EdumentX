/**
 * EdumentX — Mock Review Repository
 *
 * In-memory implementation of `ReviewRepository`. Same shape as
 * the Firebase one — drop-in interchangeable. Used when
 * `EXPO_PUBLIC_USE_MOCK_DATA=true`.
 */

import type { Unsubscribe } from "@react-native-firebase/firestore";

import type { Review } from "@/lib/tutor/types";
import type {
  ReviewRepository,
  SubmitReviewInput,
} from "@/services/enrollments/ReviewRepository";

type AnyCallback = (payload: unknown) => void;

class Emitter {
  private listeners = new Map<string, Set<AnyCallback>>();
  on<T>(key: string, cb: (payload: T) => void): Unsubscribe {
    const set = this.listeners.get(key) ?? new Set<AnyCallback>();
    set.add(cb as AnyCallback);
    this.listeners.set(key, set);
    return () => {
      set.delete(cb as AnyCallback);
    };
  }
  emit<T>(key: string, payload: T) {
    const set = this.listeners.get(key);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(payload);
      } catch (err) {
        console.warn("MockReviewRepository: listener failed", err);
      }
    }
  }
}

type Store = {
  reviews: Review[];
  emitter: Emitter;
};

const STORE = new Map<string, Store>();

function getStore(tutorUid: string): Store {
  let s = STORE.get(tutorUid);
  if (!s) {
    s = { reviews: [], emitter: new Emitter() };
    STORE.set(tutorUid, s);
  }
  return s;
}

export const MockReviewRepository: ReviewRepository = {
  subscribeReviews(tutorUid, onData, _onError) {
    const s = getStore(tutorUid);
    s.emitter.emit("reviews", s.reviews);
    return s.emitter.on<Review[]>("reviews", onData);
  },

  async submitReview(input: SubmitReviewInput) {
    const s = getStore(input.tutorUid);
    const review: Review = {
      id: `rev-mock-${Date.now()}`,
      reviewerName: input.studentName,
      reviewerAvatar: input.studentAvatar,
      verified: false,
      rating: input.score,
      timestamp: new Date().toISOString(),
      comment: input.comment,
    };
    s.reviews = [review, ...s.reviews];
    s.emitter.emit("reviews", s.reviews);
    return { reviewId: review.id };
  },

  async deleteReview(_tutorUid, reviewId, _actorUid, _isAdmin) {
    for (const s of STORE.values()) {
      const before = s.reviews.length;
      s.reviews = s.reviews.filter((r) => r.id !== reviewId);
      if (s.reviews.length !== before) {
        s.emitter.emit("reviews", s.reviews);
        return;
      }
    }
  },
};