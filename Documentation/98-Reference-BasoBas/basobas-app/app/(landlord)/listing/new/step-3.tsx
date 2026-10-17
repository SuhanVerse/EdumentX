import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Upload, X, Play, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { tokens } from '@/src/theme/tokens';
import { validateImageAsset } from '@/src/lib/imageValidation';
import { validateImageContent } from '@/src/services/imageValidation.service';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';

const { color, space, radius, font, size } = tokens;

const MAX_MEDIA = 12;

type MediaType = 'image' | 'video';

/**
 * `checking` = picked but not yet approved by the AI content gate.
 * The Continue button blocks while any item is still checking.
 */
type MediaStatus = 'checking' | 'ready';

interface MediaItem {
  uri: string;
  type: MediaType;
  status: MediaStatus;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NewListingStep3() {
  const router = useRouter();
  const supabase = useClerkSupabase();
  const params = useLocalSearchParams<{ propertyType: string; title: string; rent: string; deposit: string; location: string; availableFrom: string; bedrooms: string; bathrooms: string; area: string; floor: string; totalFloors: string; furnishing: string; amenities: string; }>();

  const [media, setMedia] = useState<MediaItem[]>([]);

  const handleGoBack = useCallback(() => router.back(), [router]);

  /**
   * Validate one picked image through the AI content gate. The item is added
   * to the grid immediately in `checking` state (instant feedback), then
   * flips to `ready` or is removed with the rejection reason.
   */
  const trackImageAsset = useCallback(
    (asset: ImagePicker.ImagePickerAsset) => {
      const technical = validateImageAsset(asset, 'property');
      if (!technical.ok) {
        Alert.alert('Invalid photo', technical.message);
        return;
      }
      setMedia((prev) => {
        if (prev.some((m) => m.uri === asset.uri)) return prev;
        if (prev.length >= MAX_MEDIA) return prev;
        return [...prev, { uri: asset.uri, type: 'image' as const, status: 'checking' as const }];
      });

      void (async () => {
        const verdict = await validateImageContent(asset.uri, 'property', supabase);
        if (!verdict.success || !verdict.data.valid) {
          setMedia((prev) => prev.filter((m) => m.uri !== asset.uri));
          Alert.alert(
            'Photo rejected',
            verdict.success ? verdict.data.reason ?? '' : '',
          );
          return;
        }
        setMedia((prev) =>
          prev.map((m) => (m.uri === asset.uri ? { ...m, status: 'ready' as const } : m)),
        );
      })();
    },
    [supabase],
  );

  /** Videos skip the AI gate — technical checks only (size/format). */
  const trackVideoAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    const technical = validateImageAsset(asset, 'video');
    if (!technical.ok) {
      Alert.alert('Invalid video', technical.message);
      return;
    }
    setMedia((prev) => {
      if (prev.some((m) => m.uri === asset.uri)) return prev;
      if (prev.length >= MAX_MEDIA) return prev;
      return [...prev, { uri: asset.uri, type: 'video' as const, status: 'ready' as const }];
    });
  }, []);

  const addAssets = useCallback(
    (assets: ImagePicker.ImagePickerAsset[]) => {
      for (const asset of assets) {
        if (asset.type === 'video') {
          trackVideoAsset(asset);
        } else {
          trackImageAsset(asset);
        }
      }
    },
    [trackImageAsset, trackVideoAsset],
  );

  const remaining = MAX_MEDIA - media.length;

  const pickFromLibrary = useCallback(async () => {
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_MEDIA} photos and videos.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow photo library access in your settings to add photos and videos.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      addAssets(result.assets);
    }
  }, [remaining, addAssets]);

  const pickFromCamera = useCallback(async () => {
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_MEDIA} photos and videos.`);
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow camera access in your settings to capture photos and videos.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      addAssets(result.assets);
    }
  }, [remaining, addAssets]);

  const showAddOptions = useCallback(() => {
    Alert.alert('Add media', 'Choose an option', [
      { text: 'Take Photo / Video', onPress: pickFromCamera },
      { text: 'Choose from Gallery', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickFromCamera, pickFromLibrary]);

  const removeMedia = useCallback((uri: string) => {
    setMedia((prev) => prev.filter((m) => m.uri !== uri));
  }, []);

  const handleContinue = useCallback(() => {
    // Videos are skipped at upload time — a listing must have at least one
    // photo before it can move to review/publish.
    if (!media.some((m) => m.type === 'image')) {
      Alert.alert(
        'Photo required',
        'Add at least one photo of the property to continue.',
      );
      return;
    }
    if (media.some((m) => m.status === 'checking')) {
      Alert.alert(
        'Checking photos',
        'Hang on — still validating your photos.',
      );
      return;
    }
    router.push({
      pathname: '/(landlord)/listing/new/step-4',
      params: { ...params, photos: JSON.stringify(media) },
    } as any);
  }, [router, params, media]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton} accessibilityLabel="Go back">
          <ArrowLeft size={18} color={color.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>New Listing</Text>
        </View>
      </View>

      {/* ─── Progress Bar ────────────────────────────────────────────── */}
      <View style={styles.progressSection}>
        <Text style={styles.stepLabel}>Step 3 of 4</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '75%' }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ─── Headline ──────────────────────────────────────────────── */}
        <Text style={styles.headline}>Add photos & videos</Text>
        <Text style={styles.subtext}>
          {'Add at least 1 photo to continue. Listings with 5+ photos get 3× more requests.'}
        </Text>

        {/* ─── Empty state ───────────────────────────────────────────── */}
        {media.length === 0 ? (
          <Pressable
            onPress={showAddOptions}
            style={styles.uploadZone}
            accessibilityLabel="Add photos or videos">
            <View style={styles.uploadIcon}>
              <Plus size={22} color={color.ink} strokeWidth={2} />
            </View>
            <Text style={styles.uploadTitle}>Add photos & videos</Text>
            <Text style={styles.uploadHint}>Tap to upload from gallery or camera</Text>
          </Pressable>
        ) : (
          /* ─── Media Grid ──────────────────────────────────────────── */
          <View style={styles.grid}>
            {media.map((item, index) => (
              <View key={item.uri} style={styles.photoSlot}>
                <Image source={{ uri: item.uri }} style={styles.thumb} />

                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}

                {item.type === 'video' && (
                  <View style={styles.videoBadge}>
                    <Play size={12} color={color.bg} strokeWidth={2} fill={color.bg} />
                  </View>
                )}

                {item.status === 'checking' && (
                  <View style={styles.checkingOverlay} pointerEvents="none">
                    <ActivityIndicator color={color.bg} size="small" />
                  </View>
                )}

                <Pressable
                  onPress={() => removeMedia(item.uri)}
                  style={styles.removeButton}
                  hitSlop={8}
                  accessibilityLabel={`Remove ${item.type} ${index + 1}`}>
                  <X size={14} color={color.bg} strokeWidth={2.4} />
                </Pressable>
              </View>
            ))}

            {/* Add tile */}
            {media.length < MAX_MEDIA && (
              <Pressable
                onPress={showAddOptions}
                style={styles.addTile}
                accessibilityLabel="Add photo or video">
                <Plus size={20} color={color.ink2} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        )}

        {/* ─── Count ──────────────────────────────────────────────────── */}
        {media.length > 0 && (
          <Text style={styles.countText}>
            {`${media.length} of ${MAX_MEDIA} added`}
          </Text>
        )}
        {media.length > 0 && !media.some((m) => m.type === 'image') && (
          <Text style={styles.photoRequired}>
            Videos can&apos;t be published alone — add at least one photo.
          </Text>
        )}

        {/* ─── Upload from gallery ─────────────────────────────────────── */}
        <Pressable
          onPress={pickFromLibrary}
          style={styles.galleryButton}
          accessibilityLabel="Upload from gallery">
          <Upload size={18} color={color.ink} strokeWidth={1.8} />
          <Text style={styles.galleryButtonText}>Upload from gallery</Text>
        </Pressable>

        {/* ─── Take photo/video ────────────────────────────────────────── */}
        <Pressable
          onPress={pickFromCamera}
          style={styles.galleryButton}
          accessibilityLabel="Take photo or video">
          <Camera size={18} color={color.ink} strokeWidth={1.8} />
          <Text style={styles.galleryButtonText}>Take photo / video</Text>
        </Pressable>
      </ScrollView>

      {/* ─── Sticky Bottom ────────────────────────────────────────────── */}
      <View style={styles.bottomArea}>
        <Pressable
          onPress={handleContinue}
          style={styles.cta}
          accessibilityLabel="Continue"
          accessibilityRole="button">
          <Text style={styles.ctaText}>Continue</Text>
        </Pressable>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    paddingHorizontal: space.screenH,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 40,
  },
  headerTitle: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink,
  },

  // Progress
  progressSection: {
    paddingHorizontal: space.screenH,
    paddingTop: 12,
    paddingBottom: 4,
  },
  stepLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: color.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: color.ink,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.screenH,
    paddingTop: 28,
    paddingBottom: 24,
  },

  // Headline
  headline: {
    fontFamily: font.display,
    fontSize: 28,
    color: color.ink,
    marginBottom: 6,
  },
  subtext: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    marginBottom: 24,
  },

  // Media grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.card,
    backgroundColor: color.input,
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: color.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  coverBadgeText: {
    fontFamily: font.semibold,
    fontSize: size.micro,
    color: color.bg,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.card,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty upload zone
  uploadZone: {
    borderRadius: radius.card,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },
  uploadHint: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },

  countText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginTop: 12,
  },

  photoRequired: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.danger,
    marginTop: 6,
  },

  // Gallery button
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.bg,
    marginTop: 20,
  },
  galleryButtonText: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
  },

  // Bottom CTA
  bottomArea: {
    paddingHorizontal: space.screenH,
    paddingBottom: space.safeBottom + 8,
    paddingTop: 8,
  },
  cta: {
    height: space.buttonH,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.bg,
  },
});
