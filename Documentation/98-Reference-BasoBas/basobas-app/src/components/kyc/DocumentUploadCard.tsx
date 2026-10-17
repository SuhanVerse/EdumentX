import React, { useCallback } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, UploadCloud, X, AlertCircle, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';

import { UploadPlaceholder } from '@/src/components/kyc/UploadPlaceholder';
import { validateImageAsset } from '@/src/lib/imageValidation';
import { tokens } from '@/src/theme/tokens';

const { color, radius, font, size } = tokens;

/**
 * Props for `DocumentUploadCard` — the reusable per-document slot on the
 * tenant KYC Upload screen. The card is intentionally state-driven (not
 * self-managing) so the parent screen owns progress / error semantics.
 */
export type DocumentUploadCardStatus = 'empty' | 'selected' | 'uploading' | 'uploaded' | 'error';

export interface DocumentUploadCardProps {
  label: string;
  hint?: string;
  status: DocumentUploadCardStatus;
  /** Local file URI while the user has picked an image. `null` for pre-fills. */
  previewUri?: string | null;
  /** 0..1 while `status === 'uploading'`. */
  progress?: number;
  errorMessage?: string;
  /** True if this slot was pre-filled from a previous submission. */
  isPrefill?: boolean;
  onPick: (uri: string) => void;
  onRemove: () => void;
  onRetry: () => void;
}

/**
 * Compress a picked image down to ~1200px / 85% JPEG quality — same defaults
 * as the onboarding KYC and avatar pickers, so visual fidelity is consistent.
 */
const compressImage = async (uri: string): Promise<string> => {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
};

/**
 * Show the camera/library action sheet and resolve with a compressed URI or
 * `null` if the user cancels / denies permission.
 */
const pickFromOptions = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    Alert.alert('Upload Document', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Camera access needed', 'Please allow camera access in your settings.');
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1,
          });
          if (result.canceled || !result.assets[0]) {
            resolve(null);
            return;
          }
          const check = validateImageAsset(result.assets[0], 'kyc_document');
          if (!check.ok) {
            Alert.alert('Invalid document', check.message);
            resolve(null);
            return;
          }
          resolve(await compressImage(result.assets[0].uri));
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert(
              'Photo access needed',
              'Please allow photo library access in your settings.'
            );
            resolve(null);
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
          });
          if (result.canceled || !result.assets[0]) {
            resolve(null);
            return;
          }
          const check = validateImageAsset(result.assets[0], 'kyc_document');
          if (!check.ok) {
            Alert.alert('Invalid document', check.message);
            resolve(null);
            return;
          }
          resolve(await compressImage(result.assets[0].uri));
        },
      },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
};

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  label,
  hint,
  status,
  previewUri,
  progress = 0,
  errorMessage,
  isPrefill = false,
  onPick,
  onRemove,
  onRetry,
}) => {
  const handlePress = useCallback(async () => {
    if (status === 'uploaded') {
      // Tapping an uploaded card opens the picker again to replace it.
      const uri = await pickFromOptions();
      if (uri) onPick(uri);
      return;
    }
    if (status === 'uploading') return; // ignore taps mid-upload
    const uri = await pickFromOptions();
    if (uri) onPick(uri);
  }, [status, onPick]);

  const handleRemove = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove();
  }, [onRemove]);

  const handleRetry = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetry();
  }, [onRetry]);

  // ── Render: empty ────────────────────────────────────────────────────────
  if (status === 'empty') {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label} — tap to upload`}
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.card, styles.empty]}>
        <View style={styles.emptyInner}>
          <View style={styles.emptyIlloWrap}>
            <UploadPlaceholder />
          </View>
          <View style={styles.emptyCopy}>
            <View style={styles.emptyCopyRow}>
              <FileText size={14} color={color.brand} strokeWidth={2.2} />
              <Text style={styles.emptyTitle} numberOfLines={1}>
                {label}
              </Text>
            </View>
            {hint && (
              <Text style={styles.emptyHint} numberOfLines={2}>
                {hint}
              </Text>
            )}
            <View style={styles.emptyCtaRow}>
              <UploadCloud size={12} color={color.brand} strokeWidth={2.2} />
              <Text style={styles.emptyCta}>Tap to upload · JPG, PNG up to 5MB</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Render: uploaded / prefill ───────────────────────────────────────────
  if (status === 'uploaded') {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label} — tap to replace`}
        onPress={handlePress}
        activeOpacity={0.85}
        style={[styles.card, styles.uploaded]}>
        <View style={styles.uploadedRow}>
          {/* Thumbnail (or placeholder square for pre-fill with no previewUri). */}
          <View style={styles.thumb}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Check size={20} color={color.brand} strokeWidth={2.2} />
              </View>
            )}
            <View style={styles.checkBadge}>
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>

          <View style={styles.metaCol}>
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            {isPrefill ? (
              <Text style={styles.metaText} numberOfLines={1}>
                Document on file · tap to replace
              </Text>
            ) : (
              hint && (
                <Text style={styles.metaText} numberOfLines={1}>
                  {hint}
                </Text>
              )
            )}
            <View style={styles.actions}>
              <Pressable
                onPress={handlePress}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Replace ${label}`}>
                <Text style={styles.replaceLink}>Replace</Text>
              </Pressable>
              {!isPrefill && (
                <>
                  <Text style={styles.dot}>·</Text>
                  <Pressable
                    onPress={handleRemove}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${label}`}>
                    <Text style={styles.removeLink}>Remove</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Render: selected / uploading ─────────────────────────────────────────
  if (status === 'selected' || status === 'uploading') {
    const pct = Math.max(0, Math.min(1, progress));
    return (
      <View style={[styles.card, styles.filled]}>
        <View style={styles.uploadedRow}>
          <View style={styles.thumb}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <View style={styles.thumbPlaceholder} />
            )}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {status === 'uploading' ? `Uploading… ${Math.round(pct * 100)}%` : 'Ready to upload'}
            </Text>
            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
            </View>
          </View>
          {status === 'selected' && (
            <Pressable
              onPress={handleRemove}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${label}`}
              style={styles.removePill}>
              <X size={14} color={color.ink2} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // ── Render: error ────────────────────────────────────────────────────────
  return (
    <View style={[styles.card, styles.errorCard]}>
      <View style={styles.uploadedRow}>
        <View style={[styles.thumb, styles.thumbError]}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <AlertCircle size={20} color={color.danger} strokeWidth={2.2} />
          )}
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.errorText} numberOfLines={2}>
            {errorMessage ?? 'Upload failed'}
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={handleRetry}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Retry ${label}`}>
              <Text style={styles.retryLink}>Retry</Text>
            </Pressable>
            <Text style={styles.dot}>·</Text>
            <Pressable
              onPress={handleRemove}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Replace ${label}`}>
              <Text style={styles.removeLink}>Replace</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

DocumentUploadCard.displayName = 'DocumentUploadCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    padding: 14,
    backgroundColor: color.bg,
  },

  // Empty ───────────────────────────────────────────────────────────────────
  empty: {
    minHeight: 152,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: color.line,
    backgroundColor: color.canvas,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  emptyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emptyIlloWrap: {
    width: 96,
    height: 124,
  },
  emptyCopy: {
    flex: 1,
    gap: 4,
  },
  emptyCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: font.semibold,
    fontSize: size.bodySm, // 13
    color: color.ink,
    flexShrink: 1,
  },
  emptyHint: {
    fontFamily: font.sans,
    fontSize: size.caption, // 12
    color: color.ink2,
    lineHeight: 16,
  },
  emptyCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  emptyCta: {
    fontFamily: font.medium,
    fontSize: size.micro + 1, // 11
    color: color.brand,
  },

  // Filled (selected/uploading) ─────────────────────────────────────────────
  filled: {
    borderStyle: 'solid',
    borderColor: color.line,
  },

  // Uploaded ─────────────────────────────────────────────────────────────────
  uploaded: {
    borderStyle: 'solid',
    borderColor: color.brandLight,
    backgroundColor: color.brandLight + '66', // ~40% tint over white
  },

  // Error ────────────────────────────────────────────────────────────────────
  errorCard: {
    borderStyle: 'solid',
    borderColor: color.danger,
    backgroundColor: color.dangerBg + '4D', // ~30% tint
  },

  // Press feedback ──────────────────────────────────────────────────────────
  pressed: {
    transform: [{ scale: 0.98 }],
  },

  // Shared row layout ───────────────────────────────────────────────────────
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: color.canvas,
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.brandLight,
  },
  thumbError: {
    backgroundColor: color.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.bg,
  },

  metaCol: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
  },
  metaText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },
  errorText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.danger,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  dot: {
    color: color.ink3,
    fontSize: size.caption,
    marginHorizontal: 2,
  },
  replaceLink: {
    fontFamily: font.semibold,
    fontSize: size.caption,
    color: color.brand,
  },
  removeLink: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: color.ink2,
  },
  retryLink: {
    fontFamily: font.semibold,
    fontSize: size.caption,
    color: color.danger,
  },

  removePill: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressTrack: {
    height: 4,
    backgroundColor: color.canvas,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: color.brand,
    borderRadius: radius.pill,
  },
});
