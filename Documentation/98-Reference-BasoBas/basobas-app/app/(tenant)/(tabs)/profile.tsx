import { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  View,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  BadgeCheck,
  Bookmark,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  Settings,
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
import { useUserStore } from '@/src/store/userStore';

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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileTab() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const favoriteIds = useUserStore((s) => s.favoriteIds);
  const setAvatarUri = useUserStore((s) => s.setAvatarUri);

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

  return (
    <ScreenBody>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── 1. Header row ─────────────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
          <Text className="font-display text-h1 leading-tight text-ink">Profile</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => go('/(tenant)/settings')}
            className="h-11 w-11 items-center justify-center rounded-pill bg-input">
            <Settings size={18} color="#0A0A0A" />
          </Pressable>
        </View>
        <View className="h-px w-full bg-line" />

        <View className="px-6 pt-6">
          {/* ── 2. Profile card ─────────────────────────────────────────────── */}
          <MenuCard>
            <View className="p-5">
              <View className="flex-row items-start">
                <Avatar
                  size={80}
                  initials={initialsOf(profile.firstName, profile.lastName)}
                  uri={profile.avatarUrl}
                  showEditBadge
                  onEditPress={showAvatarOptions}
                />

                <View className="ml-4 flex-1 pr-1">
                  <View className="flex-row items-center">
                    <Text
                      numberOfLines={2}
                      className="flex-shrink font-bold text-h3 text-ink">
                      {profile.firstName} {profile.lastName}
                    </Text>
                    {profile.isVerified && (
                      <BadgeCheck
                        size={16}
                        color="#1A6B4A"
                        strokeWidth={2.4}
                        style={{ marginLeft: 6, marginTop: 2 }}
                      />
                    )}
                  </View>

                  <View className="mt-1.5 flex-row items-center">
                    <MapPin size={13} color="#6B6B6B" />
                    <Text className="ml-1 font-sans text-body-sm text-ink2">
                      {profile.location}
                    </Text>
                  </View>
                  <Text className="mt-0.5 font-sans text-caption text-ink3">
                    Member since {monthYear(profile.memberSince)}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                  onPress={() => go('/(tenant)/edit-profile')}
                  className="ml-2 rounded-pill border border-line bg-bg px-3 py-1">
                  <Text className="font-medium text-body-sm text-ink">Edit</Text>
                </Pressable>
              </View>

              {/* Divider */}
              <View className="my-5 h-px bg-line" />

              {/* Stats row */}
              <View className="flex-row">
                <StatColumn
                  value={profile.stats.visits}
                  label="Visits"
                  onPress={() => go('/(tenant)/(tabs)/visits')}
                />
                <View className="w-px bg-row-divider" />
                <StatColumn
                  value={favoriteIds.length}
                  label="Saved"
                  onPress={() => go('/(tenant)/saved')}
                />
                <View className="w-px bg-row-divider" />
                <StatColumn
                  value={profile.stats.reviews}
                  label="Reviews"
                  onPress={() => go('/(tenant)/reviews')}
                />
              </View>
            </View>
          </MenuCard>

          {/* ── 3. Verify card (only when not verified) ─────────────────────── */}
          {!profile.isVerified && (
            <View className="mt-4 rounded-card bg-brand-light p-4">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-pill bg-brand">
                  <BadgeCheck size={18} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <View className="ml-3 flex-1 pr-3">
                  <Text className="font-bold text-body text-ink">
                    Verify your identity
                  </Text>
                  <Text className="mt-0.5 font-sans text-caption text-ink2">
                    Optional · Build trust with landlords
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start identity verification"
                  onPress={() => go('/(tenant)/kyc-upload')}
                  className="rounded-pill bg-brand px-5 py-2.5">
                  <Text className="font-semibold text-body-sm text-white">Verify</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── 4. List your property card ──────────────────────────────────── */}
          <MenuCard className="mt-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="List your property"
              onPress={() => go('/(tenant)/list-property')}
              className="flex-row items-center p-4">
              <View className="h-10 w-10 items-center justify-center rounded-lg bg-input">
                <Home size={18} color="#0A0A0A" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-medium text-body text-ink">List your property</Text>
                <Text className="mt-0.5 font-sans text-caption text-ink2">
                  Become a landlord on BasoBas
                </Text>
              </View>
              <ChevronRight size={18} color="#AAAAAA" />
            </Pressable>
          </MenuCard>

          {/* ── 5. ACCOUNT ──────────────────────────────────────────────────── */}
          <View className="mt-7">
            <SectionLabel label="ACCOUNT" className="mb-2.5 ml-1" />
            <MenuCard>
              <MenuRow
                label="Edit Profile"
                onPress={() => go('/(tenant)/edit-profile')}
                icon={
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-input">
                    <User size={18} color="#0A0A0A" />
                  </View>
                }
              />
              <MenuRow
                label="Saved Properties"
                onPress={() => go('/(tenant)/saved')}
                icon={
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-input">
                    <Bookmark size={18} color="#0A0A0A" />
                  </View>
                }
              />
              <MenuRow
                label="Visit History"
                onPress={() =>
                  go('/(tenant)/(tabs)/visits?initialTab=past')
                }
                icon={
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-input">
                    <Clock size={18} color="#0A0A0A" />
                  </View>
                }
              />
              <MenuRow
                label="My Reviews"
                onPress={() => go('/(tenant)/reviews')}
                icon={
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-input">
                    <Star size={18} color="#0A0A0A" />
                  </View>
                }
                isLast
              />
            </MenuCard>
          </View>

          {/* ── 6. PREFERENCES ──────────────────────────────────────────────── */}
          {/* TODO: confirm exact Preferences rows with design — these three
              were inferred from the bottom-edge PREFERENCES label in the
              reference. Replace as the design finalizes. */}
          <View className="mt-7">
            <SectionLabel label="PREFERENCES" className="mb-2.5 ml-1" />
            <MenuCard>
              <MenuRow
                label="Notifications"
                onPress={() => go('/(tenant)/notifications')}
                icon={
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-input">
                    <BadgeCheck size={18} color="#0A0A0A" />
                  </View>
                }
              />
              <MenuRow
                label="Language"
                onPress={() => go('/(tenant)/preferences')}
                icon={
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-input">
                    <User size={18} color="#0A0A0A" />
                  </View>
                }
              />
              <MenuRow
                label="Appearance"
                onPress={() => go('/(tenant)/preferences')}
                icon={
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-input">
                    <Settings size={18} color="#0A0A0A" />
                  </View>
                }
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
}: {
  value: number;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Open ${label} (${value})`}
    onPress={onPress}
    className="flex-1 items-center justify-center px-2 py-3">
    <Text className="font-bold text-h2 text-ink">{value}</Text>
    <Text className="mt-0.5 font-sans text-caption text-ink2">{label}</Text>
  </Pressable>
);