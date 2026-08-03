import { useEffect, useMemo, useRef } from 'react';
import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { CalendarDays, Clock, ChevronRight, ImageIcon } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/src/theme/tokens';
import { TIME_SLOT_LABELS, type TenantVisitRequest } from '@/src/types/property.types';
import { FollowUpPendingBadge, VISIT_CHIP_STYLES, VisitStatusChip } from './VisitStatusChip';

const { color, space, radius, font, size } = tokens;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const parseVisitDate = (iso: string) => new Date(`${iso}T00:00:00`);

// ─── Component ───────────────────────────────────────────────────────────────

interface VisitListCardProps {
  visit: TenantVisitRequest;
  onPress: () => void;
  /**
   * Timestamp of the last status change (`statusChangedAt[visit.id]` from the
   * visits store). When it changes while the card is mounted, the card
   * briefly flashes its border/background in the new status's tint.
   */
  flashAt?: number;
  /** Show the amber "Share feedback" badge under Completed cards. */
  showFollowUpBadge?: boolean;
}

export const VisitListCard = ({
  visit,
  onPress,
  flashAt,
  showFollowUpBadge = true,
}: VisitListCardProps) => {
  const tint = VISIT_CHIP_STYLES[visit.statusUi].bg;
  const flash = useSharedValue(0);
  const lastFlash = useRef(flashAt ?? 0);

  useEffect(() => {
    if (flashAt == null || flashAt <= lastFlash.current) return;
    lastFlash.current = flashAt;
    flash.value = 0;
    flash.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) })
    );
  }, [flashAt, flash]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(flash.value, [0, 1], [color.line, tint]),
    backgroundColor: interpolateColor(flash.value, [0, 1], [color.bg, tint]),
  }));

  const visitDate = useMemo(() => parseVisitDate(visit.requestedDate), [visit.requestedDate]);
  const isToday = isSameDay(visitDate, new Date());
  const timeLabel = TIME_SLOT_LABELS[visit.timeSlot];

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Pressable onPress={onPress} accessibilityRole="button" style={styles.pressable}>
        {/* Thumbnail */}
        <View style={styles.thumb}>
          {visit.propertyPhotoUrl ? (
            <Image
              source={{ uri: visit.propertyPhotoUrl }}
              style={styles.thumbImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <ImageIcon size={20} color={color.ink3} strokeWidth={1.5} />
            </View>
          )}
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.titleWrap}>
              <Text numberOfLines={1} style={styles.title}>
                {visit.propertyTitle ?? 'Property'}
              </Text>
              <Text numberOfLines={1} style={styles.address}>
                {visit.propertyArea ?? 'Location unavailable'}
              </Text>
            </View>
            <View style={styles.chipWrap}>
              <VisitStatusChip status={visit.statusUi} />
            </View>
          </View>

          <View style={styles.metaRow}>
            <CalendarDays size={14} color={color.ink2} />
            <Text style={styles.metaText}>{isToday ? 'Today' : formatDate(visitDate)}</Text>
            <View style={styles.metaDot} />
            <Clock size={14} color={color.ink2} />
            <Text numberOfLines={1} style={[styles.metaText, styles.metaTime]}>
              {timeLabel}
            </Text>
          </View>

          {showFollowUpBadge && visit.followUpPending && (
            <View style={styles.followUpWrap}>
              <FollowUpPendingBadge />
            </View>
          )}
        </View>

        <ChevronRight size={18} color={color.ink2} style={styles.chevron} />
      </Pressable>
    </Animated.View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.bg,
    overflow: 'hidden',
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.cardPad,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: color.canvas,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },
  address: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    marginTop: 1,
  },
  chipWrap: {
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  metaText: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
    marginLeft: 5,
  },
  metaTime: {
    flexShrink: 1,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: color.ink3,
    marginHorizontal: 8,
  },
  followUpWrap: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  chevron: {
    marginLeft: 8,
  },
});
