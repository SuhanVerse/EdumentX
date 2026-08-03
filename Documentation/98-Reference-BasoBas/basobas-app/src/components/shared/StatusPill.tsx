import { View, Text } from 'react-native';

type Status =
  | 'available'
  | 'pending'
  | 'in-discussion'
  | 'occupied'
  | 'verified'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'kyc-pending'
  | 'kyc-verified'
  | 'kyc-rejected';

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string; dotColor: string }> =
  {
    available: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Available',
      dotColor: '#22C55E',
    },
    pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending', dotColor: '#F59E0B' },
    'in-discussion': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'In Discussion',
      dotColor: '#3B82F6',
    },
    occupied: { bg: 'bg-red-100', text: 'text-red-800', label: 'Occupied', dotColor: '#EF4444' },
    verified: { bg: 'bg-brand-light', text: 'text-brand', label: 'Verified', dotColor: '#1A6B4A' },
    scheduled: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Scheduled',
      dotColor: '#3B82F6',
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Completed',
      dotColor: '#22C55E',
    },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled', dotColor: '#EF4444' },
    // KYC variants — match the status palette in tokens.ts / tailwind.config.
    'kyc-pending': {
      bg: 'bg-warn-bg',
      text: 'text-warn',
      label: 'Under Review',
      dotColor: '#B45309',
    },
    'kyc-verified': {
      bg: 'bg-success-bg',
      text: 'text-success-dark',
      label: 'Verified',
      dotColor: '#22C55E',
    },
    'kyc-rejected': {
      bg: 'bg-danger-bg',
      text: 'text-danger',
      label: 'Rejected',
      dotColor: '#E53E3E',
    },
  };

type Props = {
  status: Status;
  customLabel?: string;
};

export const StatusPill = ({ status, customLabel }: Props) => {
  const style = STATUS_STYLES[status];

  return (
    <View className={`flex-row items-center rounded-pill px-2.5 py-1 ${style.bg}`}>
      <View
        className="mr-1.5 h-1.5 w-1.5 rounded-pill"
        style={{ backgroundColor: style.dotColor }}
      />
      <Text className={`font-semibold text-caption ${style.text}`}>
        {customLabel || style.label}
      </Text>
    </View>
  );
};
