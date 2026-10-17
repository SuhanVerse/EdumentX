import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  CircleAlert,
  LogOut,
  Sparkles,
  User,
} from 'lucide-react-native';
import Constants from 'expo-constants';

import { ScreenHeader } from '@/src/components/layout/ScreenHeader';
import { MenuCard } from '@/src/components/shared/MenuCard';
import { MenuRow } from '@/src/components/shared/MenuRow';
import { SectionLabel } from '@/src/components/layout/SectionLabel';
import { useAuth } from '@/src/hooks/useAuth';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const go = (path: string) => router.push(path as any);

  const { logout } = useAuth();

  // Rounded gray icon cells, same treatment as the Profile tab rows.
  const iconCell = (Icon: typeof User, props?: { color?: string; bg?: string }) => (
    <View
      className="h-[34px] w-[34px] items-center justify-center rounded-[10px]"
      style={{ backgroundColor: props?.bg ?? '#F5F5F5' }}>
      <Icon size={16} color={props?.color ?? '#0A0A0A'} strokeWidth={2} />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Settings" showBack centerTitle />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}>
        {/* ── PREFERENCES ─────────────────────────────────────────────── */}
        <SectionLabel label="PREFERENCES" className="mb-2.5 ml-1" />
        <MenuCard>
          <MenuRow
            label="Notifications"
            subtitle="Inbox and delivery"
            onPress={() => go('/(tenant)/notifications')}
            icon={iconCell(Bell)}
          />
          <MenuRow
            label="Notification Preferences"
            subtitle="Choose what you get alerted about"
            onPress={() => go('/(tenant)/_modal/notifications-prefs')}
            icon={iconCell(Sparkles)}
            isLast
          />
        </MenuCard>

        {/* ── ACCOUNT ─────────────────────────────────────────────────── */}
        <SectionLabel label="ACCOUNT" className="mb-2.5 ml-1 mt-5" />
        <MenuCard>
          <MenuRow
            label="Edit Profile"
            onPress={() => go('/(tenant)/edit-profile')}
            icon={iconCell(User)}
            isLast
          />
        </MenuCard>

        {/* ── SUPPORT ─────────────────────────────────────────────────── */}
        <SectionLabel label="SUPPORT" className="mb-2.5 ml-1 mt-5" />
        <MenuCard>
          <MenuRow
            label="Report a Problem"
            onPress={() => go('/(tenant)/report')}
            icon={iconCell(CircleAlert)}
            isLast
          />
        </MenuCard>

        {/* ── Log out ─────────────────────────────────────────────────── */}
        <MenuCard className="mt-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={logout}
            className="flex-row items-center px-4 py-3">
            {iconCell(LogOut, { color: '#DC2626', bg: '#FEF2F2' })}
            <Text className="ml-3 flex-1 font-medium text-body text-danger">Log Out</Text>
            <ChevronRight size={18} color="#AAAAAA" />
          </Pressable>
        </MenuCard>

        {/* ── Version footer ──────────────────────────────────────────── */}
        <Text className="mt-6 text-center font-sans text-caption text-ink3">
          BasoBas v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
