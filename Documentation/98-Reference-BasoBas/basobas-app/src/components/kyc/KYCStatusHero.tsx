import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BadgeCheck,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { StatusPill } from '@/src/components/shared/StatusPill';
import type { KYCStatusUi } from '@/src/types/kyc.types';
import { tokens } from '@/src/theme/tokens';

const { color, font, size, radius, space } = tokens;

interface HeroConfig {
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  supporting: string;
  pillStatus: 'kyc-pending' | 'kyc-verified' | 'kyc-rejected';
}

const HERO_BY_STATUS: Record<KYCStatusUi, HeroConfig> = {
  not_submitted: {
    Icon: ShieldCheck,
    iconBg: color.brandLight,
    iconColor: color.brand,
    label: 'Verify your identity',
    supporting:
      'Get a Verified Tenant badge and faster visit approvals from landlords.',
    pillStatus: 'kyc-pending', // never rendered; placeholder
  },
  pending: {
    Icon: Clock,
    iconBg: color.warnBg,
    iconColor: color.warn,
    label: 'Under Review',
    supporting:
      "We've received your documents and are verifying them. This usually takes 1–2 business days.",
    pillStatus: 'kyc-pending',
  },
  verified: {
    Icon: BadgeCheck,
    iconBg: color.successBg,
    iconColor: color.successDark,
    label: 'Verified',
    supporting:
      'Your identity has been verified. You have full access to BasoBas.',
    pillStatus: 'kyc-verified',
  },
  rejected: {
    Icon: AlertCircle,
    iconBg: color.dangerBg,
    iconColor: color.danger,
    label: 'Rejected',
    supporting:
      'Your submission was rejected. See the reason below and resubmit updated documents.',
    pillStatus: 'kyc-rejected',
  },
};

interface Props {
  status: KYCStatusUi;
}

/**
 * `KYCStatusHero` — the focal card on the KYC Verification Status screen.
 *
 * - Renders the status icon in a 64×64 circle, color-mapped per status.
 * - For `pending`, gently breathes (opacity 0.85 ↔ 1.0, 1.5s loop).
 * - Enters with a soft scale-in (0.9 → 1) on first render via reanimated.
 * - Mounts the status pill in the same visual language as property-status
 *   chips elsewhere in the app.
 */
export const KYCStatusHero: React.FC<Props> = ({ status }) => {
  const cfg = HERO_BY_STATUS[status];

  // ── Pulse animation for pending ──────────────────────────────────────────
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (status !== 'pending') return;
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    // No cleanup: a new `withRepeat` replaces the previous one on status
    // change, and a hard-set on unmount would race with the in-flight worklet.
  }, [pulse, status]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  // ── Enter animation ──────────────────────────────────────────────────────
  const enterScale = useSharedValue(0.9);
  const enterOpacity = useSharedValue(0);
  useEffect(() => {
    enterScale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    enterOpacity.value = withTiming(1, { duration: 220 });
  }, [enterScale, enterOpacity]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ scale: enterScale.value }],
  }));

  return (
    <Animated.View
      style={[styles.card, enterStyle]}
      accessibilityLabel={`Verification status: ${cfg.label}`}>
      <Animated.View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }, pulseStyle]}>
        <cfg.Icon size={32} color={cfg.iconColor} strokeWidth={2} />
      </Animated.View>

      <Text style={styles.label}>{cfg.label}</Text>
      <Text style={styles.supporting}>{cfg.supporting}</Text>

      {status !== 'not_submitted' && (
        <View style={styles.pillRow}>
          <StatusPill status={cfg.pillStatus} />
        </View>
      )}
    </Animated.View>
  );
};

KYCStatusHero.displayName = 'KYCStatusHero';

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.hero,
    padding: space.cardPad * 1.5, // 24
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  label: {
    fontFamily: font.display,
    fontSize: 28,
    lineHeight: 34,
    color: color.ink,
    textAlign: 'center',
  },
  supporting: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: size.bodySm,
    lineHeight: 20,
    color: color.ink2,
    textAlign: 'center',
    maxWidth: 320,
  },
  pillRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
  },
});