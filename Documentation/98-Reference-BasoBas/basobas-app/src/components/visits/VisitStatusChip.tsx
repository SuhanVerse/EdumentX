import { View, Text, StyleSheet } from 'react-native';
import type { TenantVisitStatusUi } from '@/src/types/property.types';

/**
 * Status chip for tenant-facing visit states. Same visual grammar as the
 * property-status chips and `VisitStatusBadge`: soft tinted background,
 * saturated text, small leading dot. No chip color is invented outside the
 * mapping below — it extends the property-chip palette:
 *
 *   pending     → KYC "under review" amber      (#FFF3E0 / #B45309)
 *   rescheduled → "Under Discussion" blue       (#DBEAFE / #1E40AF)
 *   accepted    → "Available" green             (#DCFCE7 / #15803D)
 *   completed   → neutral gray                  (#F3F4F6 / #6B7280)
 *   rejected    → danger red                    (#FEE2E2 / #E53E3E)
 *   cancelled   → neutral gray (distinguished by ✕ icon / label)
 */

export interface VisitChipStyle {
  bg: string;
  text: string;
  dot: string;
}

export const VISIT_CHIP_STYLES: Record<TenantVisitStatusUi, VisitChipStyle> = {
  pending: { bg: '#FFF3E0', text: '#B45309', dot: '#B45309' },
  rescheduled: { bg: '#DBEAFE', text: '#1E40AF', dot: '#1E40AF' },
  accepted: { bg: '#DCFCE7', text: '#15803D', dot: '#15803D' },
  completed: { bg: '#F3F4F6', text: '#6B7280', dot: '#6B7280' },
  rejected: { bg: '#FEE2E2', text: '#E53E3E', dot: '#E53E3E' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280', dot: '#6B7280' },
};

export const VISIT_CHIP_LABELS: Record<TenantVisitStatusUi, string> = {
  pending: 'Pending',
  rescheduled: 'Rescheduled',
  accepted: 'Accepted',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

interface VisitStatusChipProps {
  status: TenantVisitStatusUi;
  /** Override the default label (e.g. "Rescheduled by Landlord"). */
  label?: string;
}

export const VisitStatusChip = ({ status, label }: VisitStatusChipProps) => {
  const style = VISIT_CHIP_STYLES[status];
  return (
    <View style={[styles.chip, { backgroundColor: style.bg }]}>
      <View style={[styles.dot, { backgroundColor: style.dot }]} />
      <Text style={[styles.label, { color: style.text }]}>
        {label ?? VISIT_CHIP_LABELS[status]}
      </Text>
    </View>
  );
};

/**
 * Secondary "Follow-up pending" badge — amber (awaiting your input), shown
 * only under a Completed chip when the tenant hasn't answered yet.
 */
export const FollowUpPendingBadge = () => (
  <View style={[styles.chip, { backgroundColor: '#FFF3E0' }]}>
    <View style={[styles.dot, { backgroundColor: '#B45309' }]} />
    <Text style={[styles.label, { color: '#B45309' }]}>Share feedback</Text>
  </View>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
  },
});
