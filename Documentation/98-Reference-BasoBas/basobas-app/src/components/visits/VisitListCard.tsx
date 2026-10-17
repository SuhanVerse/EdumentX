import { useEffect, useMemo, useRef } from 'react';
import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { CalendarDays, ChevronRight, Clock } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '@/src/theme/tokens';
import {
  TIME_SLOT_LABELS,
  dayLabel,
  initialsOf,
  type TenantVisitRequest,
} from '@/src/types/property.types';
import { FollowUpPendingBadge, VISIT_CHIP_STYLES, VisitStatusChip } from './VisitStatusChip';

const { color, space, radius, font, size } = tokens;

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
  const tint = VISIT_CHIP_STYLES[visit.statusUi].dot;
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
  }));

  const displayDay = useMemo(() => dayLabel(visit.requestedDate), [visit.requestedDate]);
  const timeLabel = TIME_SLOT_LABELS[visit.timeSlot];
  const isPending = visit.statusUi === 'pending';

  return (
    <View style={styles.card}>
      {/* Flash overlay — animates only its own border layer, so the card's
          static chrome (border / radius / background / inset) always renders
          even if the animated layer misbehaves. */}
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, animatedStyle]} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Visit: ${visit.propertyTitle ?? 'Property'}`}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
        {/* Attention accent — pending only */}
        {isPending && <View style={styles.accentBar} />}

        {/* Landlord avatar */}
        <View style={styles.avatar}>
          {visit.landlordAvatarUrl ? (
            <Image
              source={{ uri: visit.landlordAvatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
              accessible={false}
            />
          ) : (
            <Text style={styles.avatarInitials}>{initialsOf(visit.landlordName)}</Text>
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

          {/* Meta pills: day + slot */}
          <View style={styles.pillsRow}>
            <View style={styles.pill}>
              <CalendarDays size={12} color={color.ink3} strokeWidth={2} />
              <Text style={styles.pillText}>{displayDay}</Text>
            </View>
            <View style={[styles.pill, styles.pillFlex]}>
              <Clock size={12} color={color.ink3} strokeWidth={2} />
              <Text numberOfLines={1} style={[styles.pillText, styles.pillTextFlex]}>
                {timeLabel}
              </Text>
            </View>
          </View>

          {showFollowUpBadge && visit.followUpPending && (
            <View style={styles.followUpWrap}>
              <FollowUpPendingBadge />
            </View>
          )}
        </View>

        <ChevronRight size={18} color={color.ink2} style={styles.chevron} />
      </Pressable>
    </View>
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
    // Inset the card box from the screen edges so it aligns with the
    // header's px-6 (24) padding instead of running full-bleed.
    marginHorizontal: space.screenH,
  },
  /** Absolutely-positioned ring that carries the realtime status flash. */
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.cardPad,
  },
  pressed: {
    opacity: 0.86,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: color.brand,
    borderTopRightRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink2,
  },
  body: {
    flex: 1,
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
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillFlex: {
    flex: 1,
    minWidth: 0,
  },
  pillText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink2,
  },
  pillTextFlex: {
    flexShrink: 1,
  },
  followUpWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  chevron: {
    marginLeft: 4,
  },
});
