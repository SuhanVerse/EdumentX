import { View, Text, StyleSheet } from 'react-native';
import type { TenantVisitStatusUi } from '@/src/types/property.types';

/**
 * Minimal status label for visit states — a colored dot + letter-spaced
 * label, no pill fill. Keeps the card surface clean while the dot carries
 * the semantic state:
 *
 *   pending     → amber "under review"   (#B45309)
 *   rescheduled → blue "under discussion" (#1E40AF)
 *   accepted    → green "available"       (#15803D)
 *   completed   → neutral gray            (#6B7280)
 *   rejected    → danger red              (#E53E3E)
 *   cancelled   → hollow dot, muted gray  (#AAAAAA) — retired state
 */

export interface VisitChipStyle {
  text: string;
  dot: string;
  /** Outline variant: hollow dot, muted text — the "retired" state. */
  outline?: boolean;
}

export const VISIT_CHIP_STYLES: Record<TenantVisitStatusUi, VisitChipStyle> = {
  pending: { text: '#B45309', dot: '#B45309' },
  rescheduled: { text: '#1E40AF', dot: '#1E40AF' },
  accepted: { text: '#15803D', dot: '#15803D' },
  completed: { text: '#6B7280', dot: '#6B7280' },
  rejected: { text: '#E53E3E', dot: '#E53E3E' },
  cancelled: { text: '#AAAAAA', dot: '#AAAAAA', outline: true },
  discussion: { text: '#1A6B4A', dot: '#1A6B4A' },
  finalized: { text: '#0A0A0A', dot: '#0A0A0A' },
};

export const VISIT_CHIP_LABELS: Record<TenantVisitStatusUi, string> = {
  pending: 'Pending',
  rescheduled: 'Rescheduled',
  accepted: 'Accepted',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  discussion: 'In Discussion',
  finalized: 'Finalized',
};

interface VisitStatusChipProps {
  status: TenantVisitStatusUi;
  /** Override the default label (e.g. "Rescheduled by Landlord"). */
  label?: string;
}

export const VisitStatusChip = ({ status, label }: VisitStatusChipProps) => {
  const style = VISIT_CHIP_STYLES[status];
  return (
    <View style={styles.chip}>
      <View
        style={[
          styles.dot,
          style.outline && styles.dotOutline,
          {
            backgroundColor: style.outline ? 'transparent' : style.dot,
            borderColor: style.dot,
          },
        ]}
      />
      <Text style={[styles.label, { color: style.text }]}>
        {label ?? VISIT_CHIP_LABELS[status]}
      </Text>
    </View>
  );
};

/**
 * Secondary "Follow-up pending" label — amber (awaiting your input), shown
 * only under a Completed chip when the tenant hasn't answered yet.
 */
export const FollowUpPendingBadge = () => (
  <View style={styles.chip}>
    <View style={[styles.dot, { backgroundColor: '#B45309' }]} />
    <Text style={[styles.label, { color: '#B45309' }]}>Share feedback</Text>
  </View>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    marginRight: 6,
  },
  dotOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.3,
  },
});
