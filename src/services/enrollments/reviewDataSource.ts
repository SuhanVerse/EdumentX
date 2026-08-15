/**
 * EdumentX — Review Repository selector
 *
 * Single source of truth for "which ReviewRepository should the app
 * use?". Mirrors `services/enrollments/dataSource.ts` — selected
 * once at module load from `EXPO_PUBLIC_USE_MOCK_DATA`.
 */

import { FirebaseReviewRepository } from "@/services/enrollments/FirebaseReviewRepository";
import { MockReviewRepository } from "@/services/enrollments/MockReviewRepository";
import type { ReviewRepository } from "@/services/enrollments/ReviewRepository";

const rawFlag = process.env.EXPO_PUBLIC_USE_MOCK_DATA;
const isMockEnabled = rawFlag === "true";

export function getReviewRepository(): ReviewRepository {
  return isMockEnabled ? MockReviewRepository : FirebaseReviewRepository;
}