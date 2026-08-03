import { View, Text } from 'react-native';

/**
 * `VisitStatus` — the lifecycle states a tenant visit can be in.
 * Mirrors the app's status vocabulary used in schedule/drawer flows.
 */
export type VisitStatus = 'confirmed' | 'pending' | 'cancelled';

const STATUS_STYLES: Record<
  VisitStatus,
  { bg: string; text: string; label: string; dotColor: string }
> = {
  // Confirmed — reuse the brand-green token (same green as price text)
  confirmed: {
    bg: 'bg-brand-light',
    text: 'text-brand',
    label: 'Confirmed',
    dotColor: '#1A6B4A',
  },
  // Pending — amber
  pending: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    label: 'Pending',
    dotColor: '#F59E0B',
  },
  // Cancelled — muted red using the existing danger tokens
  cancelled: {
    bg: 'bg-danger-bg',
    text: 'text-danger',
    label: 'Cancelled',
    dotColor: '#E53E3E',
  },
};

type Props = {
  status: VisitStatus;
  customLabel?: string;
};

/**
 * `VisitStatusBadge` — small pill used on the My Visits cards (and any
 * future visit-detail surface) to indicate the lifecycle state.
 *
 * Reuses existing palette tokens (`bg-brand-light`, `bg-danger-bg`,
 * `bg-amber-100`) so the visual reads as part of the same app.
 */
export const VisitStatusBadge = ({ status, customLabel }: Props) => {
  const style = STATUS_STYLES[status];

  return (
    <View className={`flex-row items-center rounded-pill px-2.5 py-1 ${style.bg}`}>
      <View
        className="mr-1.5 h-1.5 w-1.5 rounded-pill"
        style={{ backgroundColor: style.dotColor }}
      />
      <Text className={`font-semibold text-caption ${style.text}`}>
        {customLabel ?? style.label}
      </Text>
    </View>
  );
};

VisitStatusBadge.displayName = 'VisitStatusBadge';
