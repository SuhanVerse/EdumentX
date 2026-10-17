import React, { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, Clapperboard, Play, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

import { tokens } from '@/src/theme/tokens';
import { KYC_VIDEO_MAX_BYTES } from '@/src/services/storage.service';

const { color, radius, font, size } = tokens;

/** Hard cap on walkthrough length — "short 1–2 min" per product spec. */
export const HOME_TOUR_MAX_SECONDS = 120;

export type VideoUploadCardStatus = 'empty' | 'selected' | 'uploading' | 'uploaded';

export interface VideoUploadCardProps {
  label: string;
  hint?: string;
  status: VideoUploadCardStatus;
  /** Local file URI of the picked video. */
  previewUri?: string | null;
  /** Picked video duration in seconds — shown as a chip when present. */
  durationSeconds?: number | null;
  /** True if the slot was pre-filled from a previous submission. */
  isPrefill?: boolean;
  onPick: (uri: string, durationSeconds: number) => void;
  onRemove: () => void;
}

const formatDuration = (seconds?: number | null): string | null => {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Action sheet for picking a short home-tour video. Validates duration
 * (≤ 2 min, when known) and file size (≤ bucket cap) before resolving.
 *
 * Library picks use `expo-document-picker` — expo-image-picker crashes on
 * some Android videos while extracting metadata ("Failed to extract
 * metadata from video file"). DocumentPicker returns the file as-is.
 */
const pickVideoFromOptions = async (): Promise<{ uri: string; seconds: number } | null> => {
  const checkLimits = (seconds: number, bytes?: number | null): boolean => {
    if (seconds > HOME_TOUR_MAX_SECONDS) {
      Alert.alert(
        'Video too long',
        `Please keep your home tour under ${HOME_TOUR_MAX_SECONDS / 60} minutes.`
      );
      return false;
    }
    if (bytes && bytes > KYC_VIDEO_MAX_BYTES) {
      Alert.alert('Video too large', 'Please pick a video under 100MB.');
      return false;
    }
    return true;
  };

  return new Promise((resolve) => {
    Alert.alert('Add Home Tour Video', 'Choose an option', [
      {
        text: 'Record Video',
        onPress: async () => {
          try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Camera access needed', 'Please allow camera access in your settings.');
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['videos'],
              videoMaxDuration: HOME_TOUR_MAX_SECONDS,
            });
            const asset = result.assets?.[0];
            if (!asset?.uri || result.canceled) {
              resolve(null);
              return;
            }
            const seconds = asset.duration ?? 0;
            if (!checkLimits(seconds, asset.fileSize)) {
              resolve(null);
              return;
            }
            resolve({ uri: asset.uri, seconds });
          } catch (e) {
            console.warn('[VideoUploadCard] camera record failed:', e);
            Alert.alert('Recording failed', 'Could not open the camera. Please try again.');
            resolve(null);
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: 'video/*',
              copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) {
              resolve(null);
              return;
            }
            const asset = result.assets[0];
            if (!checkLimits(0, asset.size)) {
              resolve(null);
              return;
            }
            resolve({ uri: asset.uri, seconds: 0 });
          } catch (e) {
            console.warn('[VideoUploadCard] document pick failed:', e);
            Alert.alert('Selection failed', 'Could not open the video picker. Please try again.');
            resolve(null);
          }
        },
      },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
};

/**
 * `VideoUploadCard` — extra-verification slot for a landlord's home-tour
 * walkthrough video. Visual language mirrors `DocumentUploadCard` but tuned
 * for video: dark thumb with a play glyph and a duration chip.
 */
export const VideoUploadCard: React.FC<VideoUploadCardProps> = ({
  label,
  hint,
  status,
  durationSeconds,
  isPrefill = false,
  onPick,
  onRemove,
}) => {
  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const picked = await pickVideoFromOptions();
    if (picked) onPick(picked.uri, picked.seconds);
  }, [onPick]);

  const handleRemove = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove();
  }, [onRemove]);

  // ── Empty ────────────────────────────────────────────────────────────────
  if (status === 'empty') {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label} — tap to add`}
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.card, styles.empty]}>
        <View style={styles.emptyIcon}>
          <Clapperboard size={18} color={color.brand} strokeWidth={2} />
        </View>
        <View style={styles.emptyCopy}>
          <Text style={styles.title}>{label}</Text>
          {hint && (
            <Text style={styles.hintText} numberOfLines={2}>
              {hint}
            </Text>
          )}
        </View>
        <View style={styles.addPill}>
          <Text style={styles.addPillText}>Add</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const durationLabel = formatDuration(durationSeconds);

  // ── Selected / uploaded ──────────────────────────────────────────────────
  const RowWrapper = status === 'uploaded' ? TouchableOpacity : View;
  return (
    <RowWrapper
      {...(status === 'uploaded'
        ? {
            accessibilityRole: 'button' as const,
            accessibilityLabel: `${label} — tap to replace`,
            onPress: handlePress,
            activeOpacity: 0.85,
          }
        : {})}
      style={[styles.card, styles.filledRow, status === 'uploaded' && styles.uploadedCard]}>
      {/* Dark video thumb with play glyph */}
      <View style={styles.thumb}>
        <Play size={16} color="#FFFFFF" strokeWidth={2.4} fill="#FFFFFF" />
      </View>

      <View style={styles.metaCol}>
        <Text style={styles.title} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.metaRow}>
          {status === 'uploaded' && (
            <View style={styles.checkBadge}>
              <Check size={10} color={color.brand} strokeWidth={3} />
              <Text style={styles.checkText}>Uploaded</Text>
            </View>
          )}
          {isPrefill && !durationLabel && (
            <Text style={styles.metaText}>Video on file · tap to replace</Text>
          )}
          {durationLabel && <Text style={styles.metaText}>{durationLabel}</Text>}
        </View>
      </View>

      <Pressable
        onPress={handleRemove}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${label}`}
        style={styles.removePill}>
        <X size={14} color={color.ink2} strokeWidth={2.2} />
      </Pressable>
    </RowWrapper>
  );
};

VideoUploadCard.displayName = 'VideoUploadCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    backgroundColor: color.bg,
  },

  // Empty ───────────────────────────────────────────────────────────────────
  empty: {
    borderStyle: 'dashed',
    borderColor: color.line,
    backgroundColor: color.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: color.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: {
    flex: 1,
    gap: 2,
  },
  addPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPillText: {
    fontFamily: font.semibold,
    fontSize: size.caption,
    color: '#FFFFFF',
  },

  // Filled ──────────────────────────────────────────────────────────────────
  filledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderColor: color.line,
  },
  uploadedCard: {
    borderColor: color.brandLight,
    backgroundColor: color.brandLight + '66',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCol: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
  },
  hintText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink2,
    lineHeight: 16,
  },
  metaText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },
  checkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: color.brandLight,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  checkText: {
    fontFamily: font.medium,
    fontSize: size.micro + 1,
    color: color.brand,
  },
  removePill: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
