import { useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Globe,
  MapPin,
  Clock,
  Shield,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';

const { color, space, radius, font, size } = tokens;

// ─── Toggle Switch Component ─────────────────────────────────────────────────

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

const Toggle = ({ enabled, onToggle }: ToggleProps) => (
  <Pressable
    onPress={onToggle}
    style={[
      styles.toggleTrack,
      enabled && styles.toggleTrackActive,
      enabled && { justifyContent: 'flex-end' },
    ]}
    accessibilityLabel={enabled ? 'Disable' : 'Enable'}
    accessibilityRole="switch"
    accessibilityState={{ checked: enabled }}>
    <View style={styles.toggleThumb} />
  </Pressable>
);

// ─── Row Helpers ─────────────────────────────────────────────────────────────

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
}

const MenuRow = ({ icon, label, onPress, trailing }: MenuRowProps) => (
  <Pressable
    onPress={onPress}
    style={styles.menuRow}
    accessibilityLabel={label}
    accessibilityRole="button">
    <View style={styles.menuIcon}>{icon}</View>
    <Text style={styles.menuLabel}>{label}</Text>
    {trailing}
  </Pressable>
);

interface MenuRowWithSubtextProps {
  icon: React.ReactNode;
  label: string;
  subtext: string;
  trailing?: React.ReactNode;
}

const MenuRowWithSubtext = ({ icon, label, subtext, trailing }: MenuRowWithSubtextProps) => (
  <Pressable style={styles.menuRow} accessibilityLabel={label} accessibilityRole="button">
    <View style={styles.menuIcon}>{icon}</View>
    <View style={styles.menuCenter}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuSubtext}>{subtext}</Text>
    </View>
    {trailing}
  </Pressable>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={handleGoBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button">
          <ArrowLeft size={18} color={color.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>
      <View style={styles.headerDivider} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ─── ACCOUNT Section ───────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        <View style={styles.menuCard}>
          <MenuRow
            icon={<Globe size={18} color={color.ink} strokeWidth={1.8} />}
            label="Language"
            onPress={() => {}}
            trailing={
              <View style={styles.trailingRow}>
                <Text style={styles.trailingText}>English</Text>
                <ChevronRight size={16} color={color.ink3} strokeWidth={1.8} />
              </View>
            }
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<MapPin size={18} color={color.ink} strokeWidth={1.8} />}
            label="Default City"
            onPress={() => {}}
            trailing={
              <View style={styles.trailingRow}>
                <Text style={styles.trailingText}>Kathmandu</Text>
                <ChevronRight size={16} color={color.ink3} strokeWidth={1.8} />
              </View>
            }
          />
        </View>

        {/* ─── NOTIFICATIONS Section ──────────────────────────────────── */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>

        <View style={styles.menuCard}>
          <MenuRowWithSubtext
            icon={<Clock size={18} color={color.ink} strokeWidth={1.8} />}
            label="Reminders"
            subtext="Follow-up and visit day reminders"
            trailing={<Toggle enabled={remindersEnabled} onToggle={() => setRemindersEnabled((v) => !v)} />}
          />
        </View>

        {/* ─── PRIVACY Section ────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PRIVACY</Text>

        <View style={styles.menuCard}>
          <MenuRow
            icon={<MapPin size={18} color={color.ink} strokeWidth={1.8} />}
            label="Location Services"
            onPress={() => {}}
            trailing={
              <View style={styles.trailingRow}>
                <Text style={styles.trailingText}>While Using</Text>
                <ChevronRight size={16} color={color.ink3} strokeWidth={1.8} />
              </View>
            }
          />
          <View style={styles.menuDivider} />
          <MenuRowWithSubtext
            icon={<Shield size={18} color={color.ink} strokeWidth={1.8} />}
            label="Analytics & Data"
            subtext="Help improve BasoBas"
            trailing={<Toggle enabled={analyticsEnabled} onToggle={() => setAnalyticsEnabled((v) => !v)} />}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={<Trash2 size={18} color={color.ink} strokeWidth={1.8} />}
            label="Clear Search History"
            onPress={() => {}}
            trailing={<ChevronRight size={16} color={color.ink3} strokeWidth={1.8} />}
          />
        </View>

        {/* ─── Footer ────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>BasoBas v1.0.0 · Build 100</Text>
          <Text style={styles.footerText}>
            Made with{' '}
            <Text style={styles.heart}>❤</Text>
            {' '}in Nepal
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },

  // Header
  header: {
    height: space.headerH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screenH,
    backgroundColor: color.bg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink,
  },
  headerRight: {
    width: 40,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.screenH,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Section label
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: size.caption,
    color: color.ink3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Menu card
  menuCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: color.bg,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: space.cardPad,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },
  menuSubtext: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginTop: 2,
  },
  menuCenter: {
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: space.cardPad + 36 + 12,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trailingText: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink3,
  },

  // Toggle
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.ink3,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleTrackActive: {
    backgroundColor: color.ink,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.bg,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  footerText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    textAlign: 'center',
  },
  heart: {
    color: '#E53935',
  },
});
