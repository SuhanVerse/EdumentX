import { useState, useCallback, useMemo, useRef } from 'react';
import { Alert, ScrollView, View, Text, TextInput, Pressable, Image, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth as useClerkAuth } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  ArrowLeft,
  Check,
  Lock,
  ChevronDown,
  User,
} from 'lucide-react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { tokens } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/store/authStore';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import { useUserStore } from '@/src/store/userStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { updateProfile, updateAvatar } from '@/src/services/profile.service';
import { deleteUserData, deleteClerkUser } from '@/src/services/delete-account.service';
import { getErrorMessage } from '@/src/lib/result';
import { validateImageAsset } from '@/src/lib/imageValidation';
import { validateImageContent } from '@/src/services/imageValidation.service';

const { color, space, radius, font, size } = tokens;

// ─── Constants ────────────────────────────────────────────────────────────────

const NEPAL_CITIES = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara',
  'Biratnagar', 'Birgunj', 'Butwal', 'Dharan',
  'Hetauda', 'Itahari', 'Janakpur', 'Nepalgunj',
  'Dhangadhi', 'Bharatpur', 'Siddharthanagar',
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const compressImage = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const { userId, signOut } = useClerkAuth();
  const supabase = useClerkSupabase();
  const { profile, setProfile } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const phoneNumber = profile?.phone ?? '';
  const citySheetRef = useRef<BottomSheet>(null);

  const openCitySheet = useCallback(() => {
    citySheetRef.current?.expand();
  }, []);

  const avatarUri = useMemo(() => {
    if (!profile?.avatar_url) return null;
    const ts = profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now();
    return `${profile.avatar_url}?t=${ts}`;
  }, [profile?.avatar_url, profile?.updated_at]);

  const hasChanges = fullName !== (profile?.full_name ?? '') || city !== (profile?.city ?? '');
  const isPending = uploading || saving;

  // ── Avatar Upload ─────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (localUri: string) => {
      if (!userId || !profile) return;
      setUploading(true);
      try {
        const compressed = await compressImage(localUri);

        // AI content gate — reject non-face images before uploading.
        const verdict = await validateImageContent(compressed, 'avatar', supabase);
        if (!verdict.success || !verdict.data.valid) {
          Alert.alert(
            'Photo not suitable',
            verdict.success ? verdict.data.reason ?? '' : '',
          );
          return;
        }

        const result = await updateAvatar(userId, compressed, supabase);
        if (!result.success) {
          Alert.alert('Upload failed', result.error);
          return;
        }
        setProfile({ ...profile, avatar_url: result.data, updated_at: new Date().toISOString() });
      } catch (e) {
        Alert.alert('Upload error', getErrorMessage(e));
      } finally {
        setUploading(false);
      }
    },
    [userId, profile, supabase, setProfile],
  );

  const pickFromLibrary = useCallback(async () => {
    if (uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow photo library access in your settings to set a profile photo.',
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
      const asset = result.assets[0];
      const check = validateImageAsset(asset, 'avatar');
      if (!check.ok) {
        Alert.alert('Invalid photo', check.message);
        return;
      }
      handleUpload(asset.uri);
    }
  }, [handleUpload, uploading]);

  const pickFromCamera = useCallback(async () => {
    if (uploading) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow camera access in your settings to take a profile photo.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const check = validateImageAsset(asset, 'avatar');
      if (!check.ok) {
        Alert.alert('Invalid photo', check.message);
        return;
      }
      handleUpload(asset.uri);
    }
  }, [handleUpload, uploading]);

  const handleRemovePhoto = useCallback(async () => {
    if (!userId || !profile || uploading) return;
    setUploading(true);
    const result = await updateProfile(userId, { avatar_url: null }, supabase);
    setUploading(false);
    if (!result.success) {
      Alert.alert('Could not remove photo', result.error);
      return;
    }
    setProfile(result.data);
  }, [userId, profile, supabase, setProfile, uploading]);

  const showAvatarOptions = useCallback(() => {
    if (uploading) return;
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: pickFromCamera },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      ...(profile?.avatar_url
        ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: handleRemovePhoto }]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickFromCamera, pickFromLibrary, profile?.avatar_url, handleRemovePhoto, uploading]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!userId || !profile || saving) return;
    setSaving(true);
    const result = await updateProfile(userId, { full_name: fullName, city }, supabase);
    setSaving(false);
    if (!result.success) {
      Alert.alert('Could not save', result.error);
      return;
    }
    setProfile(result.data);
    router.back();
  }, [userId, profile, fullName, city, supabase, setProfile, router, saving]);

  const handleGoBack = useCallback(() => {
    if (isPending) return;
    router.back();
  }, [router, isPending]);

  const handleDeleteAccount = useCallback(() => {
    if (!userId) return;

    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, listings, and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? All your data will be lost permanently.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteUserData(userId, supabase);
                    } catch {
                      // Proceed even if Supabase deletion partially fails
                    }

                    try {
                      await deleteClerkUser(userId);
                    } catch {
                      // Clerk deletion may fail if env var not set
                    }

                    await signOut();
                    useAuthStore.getState().clearAll();
                    useOnboardingStore.getState().reset();
                    useUserStore.getState().reset();
                    router.replace('/(auth)/phone');
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [userId, supabase, router]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={handleGoBack}
          style={[styles.backButton, isPending && styles.backButtonDisabled]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          disabled={isPending}>
          <ArrowLeft size={18} color={isPending ? color.ink3 : color.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || !hasChanges}
          accessibilityLabel="Save"
          accessibilityRole="button">
          {saving ? (
            <ActivityIndicator size="small" color={color.brand} />
          ) : (
            <Text style={[styles.saveText, (!hasChanges) && styles.saveTextDisabled]}>Save</Text>
          )}
        </Pressable>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ─── Avatar Section ────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <Pressable onPress={showAvatarOptions} disabled={uploading} accessibilityLabel="Change profile photo">
            <View style={styles.avatarOuterRing}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarInnerRing}>
                  <User size={36} color={color.ink3} strokeWidth={1.5} />
                </View>
              )}
              {uploading && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>
          </Pressable>
          <Pressable onPress={showAvatarOptions} disabled={uploading} accessibilityLabel="Change photo" accessibilityRole="button">
            <Text style={[styles.changePhotoText, uploading && styles.changePhotoTextDisabled]}>
              {uploading ? 'Uploading…' : 'Change Photo'}
            </Text>
          </Pressable>
          <Text style={styles.photoSubtext}>JPEG or PNG · Max 5MB</Text>
        </View>

        {/* ─── PERSONAL INFO Section ─────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PERSONAL INFO</Text>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full name"
              placeholderTextColor={color.placeholder}
            />
            <Check size={18} color="#1A6B4A" strokeWidth={2.5} />
          </View>
        </View>

        {/* Phone Number (disabled) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone number</Text>
          <View style={[styles.inputContainer, styles.inputContainerDisabled]}>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={phoneNumber}
              editable={false}
            />
            <Lock size={16} color={color.ink3} strokeWidth={1.8} />
          </View>
          <View style={styles.verifiedRow}>
            <Check size={11} color="#1A6B4A" strokeWidth={3} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {/* City */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Your city</Text>
          <TouchableOpacity
            style={styles.citySelector}
            onPress={openCitySheet}
            activeOpacity={0.7}
            accessibilityLabel="Select your city"
            accessibilityRole="button">
            <Text
              style={[styles.citySelectorText, !city && styles.citySelectorPlaceholder]}>
              {city || 'Select your city'}
            </Text>
            <ChevronDown size={18} color={color.ink3} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ─── DANGER ZONE Section ───────────────────────────────────── */}
        <Text style={styles.dangerSectionLabel}>DANGER ZONE</Text>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Delete Account</Text>
          <Text style={styles.dangerDescription}>
            Permanently delete your account and all data. This cannot be undone.
          </Text>
          <Pressable
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
            accessibilityLabel="Delete my account"
            accessibilityRole="button">
            <Text style={styles.deleteButtonText}>Delete My Account</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* City Bottom Sheet */}
      <BottomSheet
        ref={citySheetRef}
        index={-1}
        snapPoints={['60%']}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}>
        <Text style={styles.sheetTitle}>Select Your City</Text>
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          {NEPAL_CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.cityRow, city === c && styles.cityRowActive]}
              onPress={() => {
                setCity(c);
                citySheetRef.current?.close();
              }}
              accessibilityRole="menuitem"
              accessibilityLabel={c}>
              <Text style={[styles.cityText, city === c && styles.cityTextActive]}>
                {c}
              </Text>
              {city === c && (
                <Check size={16} color={color.brand} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          ))}
        </BottomSheetScrollView>
      </BottomSheet>
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
  saveText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.brand,
  },
  saveTextDisabled: {
    opacity: 0.4,
  },
  backButtonDisabled: {
    opacity: 0.5,
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
    paddingTop: 28,
    paddingBottom: 40,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInnerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.brand,
    marginBottom: 4,
  },
  changePhotoTextDisabled: {
    opacity: 0.5,
  },
  photoSubtext: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },

  // Section label
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: size.caption,
    color: color.ink3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Input
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.input,
    paddingHorizontal: space.cardPad,
    gap: 8,
  },
  inputContainerDisabled: {
    backgroundColor: color.inputReadonly,
  },
  input: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
  },
  inputDisabled: {
    color: color.ink2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  verifiedText: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: '#1A6B4A',
  },

  // City selector
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.input,
    paddingHorizontal: space.cardPad,
  },
  citySelectorText: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
  },
  citySelectorPlaceholder: {
    color: color.placeholder,
  },

  // Bottom sheet
  sheetBackground: { backgroundColor: color.bg },
  sheetHandle: { backgroundColor: color.line, width: 40 },
  sheetTitle: {
    fontFamily: font.semibold,
    fontSize: size.h3,
    color: color.ink,
    paddingHorizontal: space.screenH,
    paddingVertical: space.cardPad,
  },
  sheetContent: { paddingBottom: 40 },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screenH,
    paddingVertical: space.cardPad,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  cityRowActive: { backgroundColor: color.brandLight },
  cityText: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
  },
  cityTextActive: {
    fontFamily: font.semibold,
    color: color.brand,
  },

  // Danger zone
  dangerSectionLabel: {
    fontFamily: font.bold,
    fontSize: size.caption,
    color: color.danger,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 14,
  },
  dangerCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: color.bg,
    padding: space.cardPad,
  },
  dangerTitle: {
    fontFamily: font.bold,
    fontSize: size.body,
    color: color.danger,
    marginBottom: 6,
  },
  dangerDescription: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteButton: {
    borderRadius: radius.pill,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  deleteButtonText: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: '#C62828',
  },
});
