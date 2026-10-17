import { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { VStack } from '@/src/components/visit/VStack';
import { c, font, radius, shadow, sp, t } from '@/src/theme/visitTokens';

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: '#E8F5EE', fg: '#1A6B4A' },
  { bg: '#FEF3DC', fg: '#B45309' },
  { bg: '#EAF0FB', fg: '#3B5BA5' },
  { bg: '#F3ECFB', fg: '#7C4DBC' },
  { bg: '#FDECEC', fg: '#C0392B' },
] as const;

const avatarColor = (name: string): (typeof AVATAR_PALETTE)[number] => {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
};

const avatarInitials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

interface AvatarProps {
  name: string;
  size?: number;
}

/** Circular initials avatar with a deterministic palette (name → color). */
export const Avatar = ({ name, size = 44 }: AvatarProps) => {
  const color = avatarColor(name);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color.bg },
      ]}>
      <Text style={[styles.avatarText, { color: color.fg, fontSize: Math.round(size * 0.36) }]}>
        {avatarInitials(name)}
      </Text>
    </View>
  );
};

// ─── StatusPill ──────────────────────────────────────────────────────────────

export type LdStatus = 'Pending' | 'Accepted' | 'Declined' | 'Rescheduled';

const PILL: Record<LdStatus, { text: string; bg: string }> = {
  Pending: { text: '#B45309', bg: '#FEF3DC' },
  Accepted: { text: '#1A6B4A', bg: '#E8F5EE' },
  Declined: { text: '#C0392B', bg: '#FDECEC' },
  Rescheduled: { text: '#3B5BA5', bg: '#EAF0FB' },
};

/**
 * StatusChip — text on a light tint, radius 6, padding 3×7, sansSemi 12.
 * No icon, no dot, no border — identical grammar to the tenant StatusChip.
 */
export const StatusPill = ({ status }: { status: LdStatus }) => {
  const color = PILL[status];
  return (
    <View style={[styles.pill, { backgroundColor: color.bg }]}>
      <Text style={[styles.pillText, { color: color.text }]}>{status}</Text>
    </View>
  );
};

// ─── Toggle ──────────────────────────────────────────────────────────────────

interface ToggleProps {
  on: boolean;
  onToggle: () => void;
}

const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 22;
const KNOB = 18;
const KNOB_MARGIN = 2;
const KNOB_TRAVEL = TRACK_WIDTH - KNOB - KNOB_MARGIN * 2;

/** 36×22 animated switch — green track when on, hairline when off. */
export const Toggle = ({ on, onToggle }: ToggleProps) => {
  const anim = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: on ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [on, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, KNOB_TRAVEL],
  });

  return (
    <TouchableOpacity
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      activeOpacity={0.8}
      style={[styles.toggleTrack, { backgroundColor: on ? c.accent : c.hairline }]}>
      <Animated.View style={[styles.toggleKnob, { transform: [{ translateX }] }]} />
    </TouchableOpacity>
  );
};

// ─── LdCard ──────────────────────────────────────────────────────────────────

interface LdCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  padding?: number;
}

/** White card, radius 20, the soft card shadow. Pressable when onPress given. */
export const LdCard = ({ children, onPress, style, radius: r = 20, padding = 16 }: LdCardProps) => {
  const shell = [styles.card, { borderRadius: r, padding }, style];
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={shell}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={shell}>{children}</View>;
};

// ─── ScreenShell ─────────────────────────────────────────────────────────────

interface ScreenShellProps {
  title: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
  /** Extra bottom padding for dock-free screens (default reserves the dock). */
  paddingBottom?: number;
  children: React.ReactNode;
}

/** 56px header (hairline bottom) + ScrollView body, paddingH 20. */
export const ScreenShell = ({
  title,
  showBack,
  rightSlot,
  paddingBottom = 130,
  children,
}: ScreenShellProps) => {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {showBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              activeOpacity={0.7}
              style={styles.backButton}>
              <ChevronLeft size={20} color={c.ink} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.headerSide, styles.headerSideRight]}>{rightSlot}</View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom }]}
        showsVerticalScrollIndicator={false}>
        {/* Margin-based rhythm — same as the tenant screens. */}
        <VStack gap={sp.lg}>{children}</VStack>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── SectionLabel ────────────────────────────────────────────────────────────

export const LdSectionLabel = ({ label }: { label: string }) => (
  <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: font.sansSemi,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.chip,
  },
  pillText: {
    fontFamily: font.sansSemi,
    fontSize: t.chip,
    letterSpacing: 0.1,
  },
  toggleTrack: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    padding: KNOB_MARGIN,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    ...shadow.card,
  },
  card: {
    backgroundColor: c.screenBg,
    borderRadius: 20,
    padding: 16,
    ...shadow.card,
  },
  shell: {
    flex: 1,
    backgroundColor: c.screenBg,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.hairline,
  },
  headerSide: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surfaceGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.sansSemi,
    fontSize: 17,
    color: c.ink,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionLabel: {
    fontFamily: font.sansSemi,
    fontSize: 10,
    color: c.faint,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
});
