import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  View,
  Text,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  AlertCircle,
  BadgeCheck,
  Bell,
  Bookmark,
  CalendarCheck2,
  ChevronRight,
  Clock,
  Edit,
  LogOut,
  MapPin,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  User,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { Avatar } from '@/src/components/user/Avatar';
import { MenuCard } from '@/src/components/shared/MenuCard';
import { MenuRow } from '@/src/components/shared/MenuRow';
import { SectionLabel } from '@/src/components/layout/SectionLabel';
import { ProPill } from '@/src/components/shared/ProPill';
import { useProGate } from '@/src/hooks/useProGate';
import { useUser } from '@clerk/expo';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getProfile } from '@/src/services/profile.service';
import { getUserKYCStatusUi } from '@/src/services/kyc.service';
import { useUserStore } from '@/src/store/userStore';
import type { KYCStatusUi } from '@/src/types/kyc.types';
import { tokens } from '@/src/theme/tokens';

const { color } = tokens;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const monthYear = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const initialsOf = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

const compressImage = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileTab() {
  const router = useRouter();
  const supabase = useClerkSupabase();
  const { user: clerkUser } = useUser();
  const profile = useUserStore((s) => s.profile);
  const favoriteIds = useUserStore((s) => s.favoriteIds);
  const setAvatarUri = useUserStore((s) => s.setAvatarUri);
  const syncProfileFromDb = useUserStore((s) => s.syncProfileFromDb);
  const activatePro = useUserStore((s) => s.activatePro);

  const { isPro, requireProOrModal } = useProGate();

  // KYC status — refreshed on every Profile focus so the menu row subtitle
  // and tap target reflect the latest server state.
  const [kycStatus, setKycStatus] = useState<KYCStatusUi | null>(null);

  const proDaysLeft = useMemo(() => {
    if (!profile.pro.expiresAt) return 0;
    const diff = Math.ceil((profile.pro.expiresAt.getTime() - Date.now()) / DAY_MS);
    return Math.max(0, diff);
  }, [profile.pro.expiresAt]);

  // ── Sync profile + Pro status from DB on every focus ──────────
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const clerkId = clerkUser?.id;
        if (!clerkId) return;

        try {
          // 1. Fetch profile data from the profiles table
          const profileResult = await getProfile(clerkId, supabase);
          if (!cancelled && profileResult.success) {
            syncProfileFromDb(profileResult.data as any);
          }

          // 2. Sync Pro status from user_passes table
          //    (user_passes not yet in generated types, so cast as any)
          const { data: passData } = await supabase
            .from('user_passes' as any)
            .select('*')
            .eq('status', 'ACTIVE')
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (cancelled) return;

          if (passData) {
            const pd = passData as any;
            const totalDays = pd.product_id === '3month' ? 90 : 30;
            activatePro(totalDays);
          }
        } catch (err) {
          if (!cancelled) console.error('Failed to sync profile:', err);
        }
      })();

      return () => { cancelled = true; };
    }, [clerkUser?.id, supabase, syncProfileFromDb, activatePro])
  );

  // ── Refresh KYC status on every focus ─────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const clerkId = clerkUser?.id;
        if (!clerkId) return;
        const result = await getUserKYCStatusUi(clerkId, supabase);
        if (!cancelled && result.success) {
          setKycStatus(result.data);
        }
      })();

      return () => { cancelled = true; };
    }, [clerkUser?.id, supabase])
  );

  // Optimistic avatar update — actually uploading to the backend is a TODO.
  const onAvatarPicked = useCallback(
    async (uri: string) => {
      try {
        const compressed = await compressImage(uri);
        setAvatarUri(compressed);
        // TODO: upload avatar to backend once a profile API is wired up.
      } catch {
        Alert.alert('Image error', 'Could not process the selected image.');
      }
    },
    [setAvatarUri]
  );

  const pickFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow photo library access in your settings to set a profile photo.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      onAvatarPicked(result.assets[0].uri);
    }
  }, [onAvatarPicked]);

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow camera access in your settings to take a profile photo.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      onAvatarPicked(result.assets[0].uri);
    }
  }, [onAvatarPicked]);

  const showAvatarOptions = useCallback(() => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: pickFromCamera },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      ...(profile.avatarUrl
        ? [
            {
              text: 'Remove Photo',
              style: 'destructive' as const,
              onPress: () => setAvatarUri(undefined),
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickFromCamera, pickFromLibrary, profile.avatarUrl, setAvatarUri]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const go = (path: string) => router.push(path as any);

  // ── Reusable icon wrappers (rounded gray icon cells, matching the spec) ──
  const iconCell = (Icon: typeof User, props?: { color?: string; bg?: string }) => (
    <View
      className="h-[34px] w-[34px] items-center justify-center rounded-[10px]"
      style={{ backgroundColor: props?.bg ?? '#F5F5F5' }}>
      <Icon size={16} color={props?.color ?? '#0A0A0A'} strokeWidth={2} />
    </View>
  );

  // ── KYC row bindings ─────────────────────────────────────────────────────
  // Status-driven icon, subtitle, color, and tap target for the Identity
  // Verification row. `kycStatus === null` means we haven't fetched yet — show
  // a neutral "checking" subtitle while we wait.
  const kycRow = useMemo(() => {
    const status = kycStatus;
    switch (status) {
      case 'verified':
        return {
          subtitle: 'Verified',
          subtitleClassName: 'text-brand',
          target: '/(tenant)/kyc-status',
          Icon: BadgeCheck,
          iconColor: color.successDark,
          iconBg: color.successBg,
        };
      case 'pending':
        return {
          subtitle: 'In progress',
          subtitleClassName: 'text-warn',
          target: '/(tenant)/kyc-status',
          Icon: ShieldCheck,
          iconColor: color.brand,
          iconBg: color.brandLight,
        };
      case 'rejected':
        return {
          subtitle: 'Action required',
          subtitleClassName: 'text-danger',
          target: '/(tenant)/kyc-status',
          Icon: AlertCircle,
          iconColor: color.danger,
          iconBg: color.dangerBg,
        };
      case 'not_submitted':
      default:
        return {
          subtitle: 'Verify to unlock full access',
          subtitleClassName: undefined,
          target: '/(tenant)/kyc-upload',
          Icon: ShieldCheck,
          iconColor: color.ink2,
          iconBg: color.input,
        };
    }
  }, [kycStatus]);

  return (
    <ScreenBody>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── 1. Header row ─────────────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
          <Text className="font-display text-[22px] leading-tight text-ink">Profile</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => go('/(tenant)/settings')}
            className="h-10 w-10 items-center justify-center rounded-pill bg-input">
            <Settings size={18} color="#0A0A0A" />
          </Pressable>
        </View>
        <View className="h-px w-full bg-line" />

        <View className="px-6 pt-4">
          {/* ── 2. Profile hero card ───────────────────────────────────────── */}
          <View
            className="rounded-card border border-line bg-bg p-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
            <View className="flex-row items-center">
              {/* Avatar — shows the real profile image, falls back to initials */}
              <Avatar
                size={64}
                uri={profile.avatarUrl}
                initials={initialsOf(profile.firstName, profile.lastName) || '?'}
                showEditBadge
                onEditPress={showAvatarOptions}
              />

              <View className="ml-4 flex-1 pr-1">
                <View className="flex-row items-center">
                  <Text
                    numberOfLines={1}
                    className="font-sans text-[17px] font-semibold text-ink">
                    {profile.firstName} {profile.lastName}
                  </Text>
                  {isPro && (
                    <View className="ml-1.5 h-[18px] w-[18px] items-center justify-center rounded-pill bg-brand">
                      <BadgeCheck size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </View>

                {isPro && (
                  <View className="mt-1.5 flex-row items-center">
                    <ProPill label="PRO MEMBER" icon={BadgeCheck} />
                  </View>
                )}

                <View className={`mt-1.5 flex-row items-center ${isPro ? '' : 'mt-1'}`}>
                  <MapPin size={12} color="#AAAAAA" strokeWidth={2} />
                  <Text className="ml-1 font-sans text-[13px] text-ink2">
                    {profile.location}
                  </Text>
                </View>

                {!isPro && (
                  <Text className="mt-1 font-sans text-[12px] text-ink3">
                    Member since {monthYear(profile.memberSince)}
                  </Text>
                )}
              </View>
            </View>

            {/* Divider */}
            <View className="my-4 h-px bg-divider" />

            {/* Stats row */}
            {isPro ? (
              <View className="flex-row">
                <StatColumn
                  value={profile.stats.visits}
                  label="Visits"
                  onPress={() => go('/(tenant)/(tabs)/visits')}
                />
                <View className="w-px bg-divider" />
                <StatColumn
                  value={favoriteIds.length}
                  label="Saved"
                  onPress={() => go('/(tenant)/saved')}
                />
                <View className="w-px bg-divider" />
                <StatColumn
                  value={profile.stats.reviews}
                  label="Reviews"
                  onPress={() => go('/(tenant)/reviews')}
                />
                <View className="w-px bg-divider" />
                <StatColumn
                  value={proDaysLeft}
                  label="Pro Days"
                  highlight
                />
              </View>
            ) : (
              <View className="flex-row">
                <StatColumn
                  value={profile.stats.visits}
                  label="Visits"
                  onPress={() => go('/(tenant)/(tabs)/visits')}
                />
                <View className="w-px bg-divider" />
                <StatColumn
                  value={favoriteIds.length}
                  label="Saved"
                  onPress={() => go('/(tenant)/saved')}
                />
                <View className="w-px bg-divider" />
                <StatColumn
                  value={profile.stats.reviews}
                  label="Reviews"
                  onPress={() => go('/(tenant)/reviews')}
                />
              </View>
            )}
          </View>

          {/* ── 3. Upgrade card OR Subscription tracking card ─────────────── */}
          {isPro ? (
            <View
              className="mt-3 rounded-[14px] border border-brand/15 bg-brand-light p-4">
              <View className="flex-row items-center justify-between">
                <ProPill label="PRO MEMBER" icon={BadgeCheck} />
                <View className="flex-row items-center">
                  <View className="h-2 w-2 rounded-pill bg-[#22C55E]" />
                  <Text className="ml-1.5 font-sans text-[13px] font-semibold text-[#22C55E]">
                    Active
                  </Text>
                </View>
              </View>
              <Text className="mt-2.5 font-sans text-[13px] text-ink2">
                Expires in {proDaysLeft} days
              </Text>

              {/* Progress bar */}
              <View
                className="mt-2 h-1 w-full overflow-hidden rounded-pill"
                style={{ backgroundColor: 'rgba(26,107,74,0.15)' }}>
                <View
                  className="h-1 rounded-pill bg-brand"
                  style={{
                    width: `${
                      profile.pro.totalDays > 0
                        ? Math.min(100, (proDaysLeft / profile.pro.totalDays) * 100)
                        : 0
                    }%`,
                  }}
                />
              </View>

              <View className="mt-1.5 flex-row items-center justify-between">
                <Text className="font-sans text-[11px] text-ink3">
                  {proDaysLeft} days left
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Manage subscription"
                  onPress={() => go('/(tenant)/settings')}>
                  <Text className="font-sans text-[11px] font-semibold text-brand">
                    Manage →
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View
              className="mt-3 flex-row items-center justify-between rounded-[14px] border border-brand/15 bg-brand-light p-4">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center">
                  <ProPill variant="solid" label="PRO" />
                  <Text className="ml-1.5 font-sans text-[15px] font-semibold text-ink">
                    Go Pro
                  </Text>
                </View>
                <Text className="mt-1.5 font-sans text-[13px] text-ink2">
                  Find rooms first
                </Text>
                <Text className="mt-1 font-sans text-[13px] font-semibold text-brand">
                  From NPR 249/month
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upgrade to Pro"
                onPress={() => go('/(tenant)/pro-plan')}
                className="h-[38px] items-center justify-center rounded-pill bg-brand px-[18px]">
                <Text className="font-sans text-[14px] font-semibold text-white">Upgrade</Text>
              </Pressable>
            </View>
          )}

          {/* ── 4. ACCOUNT ──────────────────────────────────────────────────── */}
          <View className="mt-5">
            <SectionLabel label="ACCOUNT" className="mb-2.5 ml-1" />
            <MenuCard>
              <MenuRow
                label="Identity Verification"
                subtitle={kycRow.subtitle}
                subtitleClassName={kycRow.subtitleClassName}
                onPress={() => go(kycRow.target)}
                icon={iconCell(kycRow.Icon, { color: kycRow.iconColor, bg: kycRow.iconBg })}
              />
              <MenuRow
                label="Edit Profile"
                onPress={() => go('/(tenant)/edit-profile')}
                icon={iconCell(User)}
              />
              <MenuRow
                label="Saved Properties"
                onPress={() => go('/(tenant)/saved')}
                icon={iconCell(Bookmark)}
              />
              <MenuRow
                label="Visit History"
                onPress={() => go('/(tenant)/(tabs)/visits?initialTab=past')}
                icon={iconCell(CalendarCheck2)}
              />
              <MenuRow
                label="My Reviews"
                onPress={() => go('/(tenant)/reviews')}
                icon={iconCell(Star)}
                isLast
              />
            </MenuCard>
          </View>

          {/* ── 5. PREFERENCES ──────────────────────────────────────────────── */}
          <View className="mt-5">
            <SectionLabel label="PREFERENCES" className="mb-2.5 ml-1" />
            <MenuCard>
              <MenuRow
                label="Rental Preferences"
                subtitle="Location, type, budget"
                onPress={() => go('/(tenant)/preferences')}
                icon={iconCell(SlidersHorizontal)}
              />
              <MenuRow
                label="AI Preferences"
                subtitle={
                  isPro ? 'Personalized recommendations active' : 'Pro · Smart picks for you'
                }
                subtitleClassName={isPro ? 'text-brand' : undefined}
                onPress={() => requireProOrModal(() => go('/(tenant)/ai-preferences'))}
                icon={iconCell(Sparkles, {
                  color: isPro ? '#1A6B4A' : '#0A0A0A',
                  bg: isPro ? '#E8F5EE' : '#F5F5F5',
                })}
                rightSlot={isPro ? undefined : <ProPill size="sm" />}
                showChevron={isPro}
              />
              <MenuRow
                label="Notifications"
                onPress={() => go('/(tenant)/notifications')}
                icon={iconCell(Bell)}
                isLast
              />
            </MenuCard>
          </View>
        </View>
      </ScrollView>
    </ScreenBody>
  );
}

// ─── Stat Column ─────────────────────────────────────────────────────────────

const StatColumn = ({
  value,
  label,
  onPress,
  highlight,
}: {
  value: number;
  label: string;
  onPress?: () => void;
  highlight?: boolean;
}) => (
  <Pressable
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={onPress ? `Open ${label} (${value})` : `${label}: ${value}`}
    onPress={onPress}
    className="flex-1 items-center justify-center px-2 py-2">
    <Text
      className={`font-sans text-[20px] font-semibold ${
        highlight ? 'text-brand' : 'text-ink'
      }`}>
      {value}
    </Text>
    <Text className="mt-[5px] font-sans text-[11px] text-ink3">{label}</Text>
  </Pressable>
);
