export type PropertyStatus = 'AVAILABLE' | 'HIGH_DEMAND' | 'UNDER_DISCUSSION' | 'OCCUPIED';

export const HIGH_DEMAND_THRESHOLD = 3;

export function recalculatePropertyStatus(
  currentStatus: PropertyStatus,
  pendingCount: number,
  discussionCount: number
): PropertyStatus {
  if (currentStatus === 'OCCUPIED') return 'OCCUPIED';

  if (discussionCount > 0) return 'UNDER_DISCUSSION';
  if (pendingCount >= HIGH_DEMAND_THRESHOLD) return 'HIGH_DEMAND';

  return 'AVAILABLE';
}
