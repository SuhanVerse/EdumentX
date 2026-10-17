import { View, Text, StyleSheet } from 'react-native';

import { font, radius, status, t, type StatusKey } from '@/src/theme/visitTokens';
import type { TenantVisitStatusUi } from '@/src/types/property.types';

/**
 * StatusChip — text on a very light tint, radius.chip (6), padding 3×7,
 * sansSemi t.chip. No icon, no border. One chip per card, never stacked.
 *
 * The app's lifecycle is wider than the five status kinds in the spec, so
 * every `TenantVisitStatusUi` maps onto the nearest kind; the label can be
 * overridden per call (e.g. the landlord History screen passes its own).
 */

const TO_KIND: Record<TenantVisitStatusUi, StatusKey> = {
  pending: 'pending',
  accepted: 'confirmed',
  rescheduled: 'rescheduled',
  rejected: 'declined',
  cancelled: 'cancelled',
  completed: 'cancelled',
  discussion: 'confirmed',
  finalized: 'confirmed',
};

const DEFAULT_LABEL: Record<TenantVisitStatusUi, string> = {
  pending: 'Pending',
  accepted: 'Confirmed',
  rescheduled: 'Rescheduled',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
  discussion: 'In Discussion',
  finalized: 'Finalized',
};

interface StatusChipProps {
  status: TenantVisitStatusUi;
  /** Override the default label. */
  label?: string;
}

export const StatusChip = ({ status: ui, label }: StatusChipProps) => {
  const kind = status[TO_KIND[ui]];
  return (
    <View style={[styles.chip, { backgroundColor: kind.bg }]}>
      <Text style={[styles.label, { color: kind.text }]}>{label ?? DEFAULT_LABEL[ui]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.chip,
  },
  label: {
    fontFamily: font.sansSemi,
    fontSize: t.chip,
    letterSpacing: 0.1,
  },
});
