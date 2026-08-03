import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';

import { tokens } from '@/src/theme/tokens';
import { usePropertyStore } from '@/src/store/propertyStore';

const { color, font, size, radius, space } = tokens;

// ─── Toggle Component ────────────────────────────────────────────────────────

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

// ─── Notification Row Component ──────────────────────────────────────────────

interface NotifRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  subtext: string;
  enabled: boolean;
  onToggle: () => void;
  isLast?: boolean;
}

const NotifRow = ({ icon, iconBg, label, subtext, enabled, onToggle, isLast }: NotifRowProps) => (
  <View style={[styles.notifRow, !isLast && styles.notifRowBorder]}>
    <View style={[styles.notifIcon, { backgroundColor: iconBg }]}>
      {icon}
    </View>
    <View style={styles.notifCenter}>
      <Text style={styles.notifLabel}>{label}</Text>
      <Text style={styles.notifSubtext}>{subtext}</Text>
    </View>
    <Toggle enabled={enabled} onToggle={onToggle} />
  </View>
);

// ─── Icon Components ─────────────────────────────────────────────────────────

const SparkleIcon = () => (
  <Text style={{ fontSize: 18, lineHeight: 20 }}>✨</Text>
);
const BellIcon = () => (
  <Text style={{ fontSize: 18, lineHeight: 20 }}>🔔</Text>
);
const HouseIcon = () => (
  <Text style={{ fontSize: 18, lineHeight: 20 }}>🏠</Text>
);
const ClockIcon = () => (
  <Text style={{ fontSize: 18, lineHeight: 20 }}>🕒</Text>
);
const MegaphoneIcon = () => (
  <Text style={{ fontSize: 18, lineHeight: 20 }}>📢</Text>
);
const PhoneIcon = () => (
  <Text style={{ fontSize: 18, lineHeight: 20 }}>📱</Text>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationPrefsModal() {
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [visitUpdates, setVisitUpdates] = useState(true);
  const [propertyStatusAlerts, setPropertyStatusAlerts] = useState(true);
  const [rentalReminders, setRentalReminders] = useState(false);
  const [basobasUpdates, setBasobasUpdates] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);

  const savedPropertyIds = usePropertyStore((s) => s.savedPropertyIds);
  const properties = usePropertyStore((s) => s.properties);

  const refreshSavedProperties = () => {
    // Fetch saved property current statuses from the store (hydrated from DB)
    const saved = properties.filter((p) => savedPropertyIds.includes(p.id));
    console.log('[PropertyStatusAlerts] Refreshed', saved.length, 'saved properties:',
      saved.map((p) => ({ id: p.id, title: p.title, price: p.price })));
  };

  return (
    <View style={styles.sheet}>
      {/* Drag Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>Notifications</Text>

        {/* ─── STAY UPDATED Section ──────────────────────────────────── */}
        <Text style={styles.sectionLabel}>STAY UPDATED</Text>

        <View style={styles.card}>
          <NotifRow
            icon={<SparkleIcon />}
            iconBg="#E0F2E9"
            label="AI Rental Suggestions"
            subtext="Smart picks based on your behavior"
            enabled={aiSuggestions}
            onToggle={() => setAiSuggestions((v) => !v)}
          />
          <NotifRow
            icon={<BellIcon />}
            iconBg="#FFF3E0"
            label="Visit Updates"
            subtext="Approvals, rejections, reminders"
            enabled={visitUpdates}
            onToggle={() => setVisitUpdates((v) => !v)}
          />
          <NotifRow
            icon={<HouseIcon />}
            iconBg="#E3F2FD"
            label="Property Status Alerts"
            subtext="When saved properties change status"
            enabled={propertyStatusAlerts}
            onToggle={() => {
              setPropertyStatusAlerts((v) => {
                if (!v) refreshSavedProperties();
                return !v;
              });
            }}
          />
          <NotifRow
            icon={<ClockIcon />}
            iconBg="#F5F5F5"
            label="Rental Reminders"
            subtext="Follow-up prompts after visits"
            enabled={rentalReminders}
            onToggle={() => setRentalReminders((v) => !v)}
          />
          <NotifRow
            icon={<MegaphoneIcon />}
            iconBg="#F5F5F5"
            label="BasoBas Updates"
            subtext="New features and announcements"
            enabled={basobasUpdates}
            onToggle={() => setBasobasUpdates((v) => !v)}
            isLast
          />
        </View>

        {/* ─── DELIVERY Section ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>DELIVERY</Text>

        <View style={styles.card}>
          <NotifRow
            icon={<PhoneIcon />}
            iconBg="#F5F5F5"
            label="Push Notifications"
            subtext="Receive alerts on your device"
            enabled={pushNotifications}
            onToggle={() => setPushNotifications((v) => !v)}
          />
          <NotifRow
            icon={<BellIcon />}
            iconBg="#F5F5F5"
            label="In-App Alerts"
            subtext="Banners while using the app"
            enabled={inAppAlerts}
            onToggle={() => setInAppAlerts((v) => !v)}
            isLast
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: color.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  // Handle
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E0E0E0',
  },

  // Content
  scrollContent: {
    paddingHorizontal: space.screenH,
    paddingTop: 12,
    paddingBottom: 40,
  },
  title: {
    fontFamily: font.bold,
    fontSize: 20,
    color: color.ink,
    marginBottom: 20,
  },

  // Section
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: size.caption,
    color: color.ink3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Card
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: color.bg,
    overflow: 'hidden',
    marginBottom: 20,
  },

  // Row
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: space.cardPad,
    gap: 12,
  },
  notifRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: color.divider,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifCenter: {
    flex: 1,
  },
  notifLabel: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },
  notifSubtext: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginTop: 2,
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
});
