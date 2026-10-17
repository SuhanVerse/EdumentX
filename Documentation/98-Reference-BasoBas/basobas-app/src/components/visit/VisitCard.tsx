import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Calendar, Clock, MapPin } from 'lucide-react-native';

import { c, font, radius, sp, t } from '@/src/theme/visitTokens';
import {
  TIME_SLOT_LABELS,
  dayLabel,
  formatMonthlyPrice,
  initialsOf,
  type TenantVisitStatusUi,
} from '@/src/types/property.types';
import { StatusChip } from './StatusChip';

interface VisitCardBaseProps {
  status: TenantVisitStatusUi;
  date: string;
  timeSlot: keyof typeof TIME_SLOT_LABELS;
  onPress: () => void;
  /** Demo-only fast-forward (EXPO_PUBLIC_DEMO_MODE builds). */
  onLongPress?: () => void;
  /** Optional right-aligned footer slot (used by All Applicants for Finalize). */
  rightSlot?: React.ReactNode;
}

interface TenantVariantProps extends VisitCardBaseProps {
  variant: 'tenant';
  propertyTitle: string;
  propertyArea: string | null;
  propertyPrice: number | null;
  propertyPhotoUrl: string | null;
}

interface LandlordVariantProps extends VisitCardBaseProps {
  variant: 'landlord';
  tenantName: string | null;
  tenantAvatarUrl: string | null;
  propertyTitle: string;
}

type VisitCardProps = TenantVariantProps | LandlordVariantProps;

/**
 * The shared card shell for My Visits, Visit Requests, and All Applicants.
 *
 * Top row: 46px radius.thumb thumbnail (warm placeholder #DADED4 with a
 * centered MapPin when there's no photo) beside a sansSemi title and muted
 * details. Bottom row: Calendar+date and Clock+time (14px c.icon) with the
 * StatusChip right. One hairline divider between rows. Warm off-white card,
 * no border, no shadow.
 */
export const VisitCard = (props: VisitCardProps) => {
  const { status, date, timeSlot, onPress, onLongPress, rightSlot } = props;
  const displayDay = dayLabel(date);
  const timeLabel = TIME_SLOT_LABELS[timeSlot];

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      accessibilityRole="button"
      accessibilityLabel={`Visit: ${headerTitle(props)}`}
      activeOpacity={0.9}
      style={styles.card}>
      {/* Top row — role-specific thumbnail + copy */}
      <View style={styles.topRow}>
        <View style={styles.thumb}>
          {props.variant === 'tenant' ? (
            props.propertyPhotoUrl ? (
              <Image
                source={{ uri: props.propertyPhotoUrl }}
                style={styles.thumbImage}
                resizeMode="cover"
              />
            ) : (
              <MapPin size={16} color={c.icon} strokeWidth={1.75} />
            )
          ) : props.tenantAvatarUrl ? (
            <Image
              source={{ uri: props.tenantAvatarUrl }}
              style={styles.thumbImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.initials}>{initialsOf(props.tenantName)}</Text>
          )}
        </View>

        <View style={styles.body}>
          <Text numberOfLines={1} style={styles.title}>
            {props.variant === 'tenant' ? props.propertyTitle : headerTitle(props)}
          </Text>
          {props.variant === 'tenant' ? (
            <Text numberOfLines={1} style={styles.meta}>
              {props.propertyArea ?? 'Location unavailable'}
            </Text>
          ) : (
            <Text numberOfLines={1} style={styles.meta}>
              {props.propertyTitle}
            </Text>
          )}
          {props.variant === 'tenant' && props.propertyPrice != null && (
            <Text style={styles.price}>{formatMonthlyPrice(props.propertyPrice)}</Text>
          )}
        </View>
      </View>

      {/* Hairline divider */}
      <View style={styles.divider} />

      {/* Bottom row — identical across roles */}
      <View style={styles.bottomRow}>
        <View style={styles.metaItem}>
          <Calendar size={14} color={c.icon} strokeWidth={1.75} />
          <Text numberOfLines={1} style={styles.metaText}>
            {displayDay}
          </Text>
        </View>
        <View style={[styles.metaItem, styles.metaItemGrow]}>
          <Clock size={14} color={c.icon} strokeWidth={1.75} />
          <Text numberOfLines={1} style={styles.metaText}>
            {timeLabel}
          </Text>
        </View>
        <View style={styles.spacer} />
        <StatusChip status={status} />
      </View>

      {rightSlot && <View style={styles.rightSlot}>{rightSlot}</View>}
    </TouchableOpacity>
  );
};

const headerTitle = (p: VisitCardProps): string => {
  if (p.variant === 'tenant') return p.propertyTitle;
  const name = p.tenantName ?? 'A tenant';
  return `${name} requested`;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: c.cardBg,
    borderRadius: radius.card,
    padding: sp.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: radius.thumb,
    backgroundColor: '#DADED4',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontFamily: font.sansSemi,
    fontSize: t.meta,
    color: c.body,
  },
  body: {
    flex: 1,
    minWidth: 0,
    marginLeft: sp.base,
  },
  title: {
    fontFamily: font.sansSemi,
    fontSize: t.cardTitle,
    color: c.title,
  },
  meta: {
    marginTop: 2,
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.meta,
  },
  price: {
    marginTop: 4,
    fontFamily: font.sansSemi,
    fontSize: t.meta,
    color: c.accent,
  },
  divider: {
    height: 1,
    marginTop: sp.base,
    backgroundColor: c.divider,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp.base,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: sp.base,
    minWidth: 0,
  },
  metaItemGrow: {
    flexShrink: 1,
  },
  metaText: {
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.meta,
    marginLeft: sp.sm,
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
    marginRight: sp.base,
  },
  rightSlot: {
    marginTop: sp.base,
  },
});
