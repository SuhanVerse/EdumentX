/**
 * TutorPreviewSheet — Bottom sheet overlay for map pin taps.
 *
 * When a student taps a tutor pin on the map, this sheet slides up
 * from the bottom showing the tutor's profile summary and a
 * "View Profile" action button.
 *
 * Uses Modal + Reanimated spring animation (matches the FiltersSheet
 * pattern used elsewhere in EdumentX — not @gorhom/bottom-sheet).
 */
import React, { useEffect } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import type { TutorListing } from '@/lib/tutor/firestoreTutorService';
import { Avatar } from '@/components/ui/Avatar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { motionSpring } from '@/lib/motion';

// ─── Props ───────────────────────────────────────────────────────────────────

interface TutorPreviewSheetProps {
  tutor: TutorListing | null;
  visible: boolean;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TutorPreviewSheet({ tutor, visible, onClose }: TutorPreviewSheetProps) {
  const router = useRouter();
  const translateY = useSharedValue(400);

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : 400, motionSpring.gentle);
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!tutor) return null;

  const formattedRate = new Intl.NumberFormat('en-NP').format(tutor.monthlyRateNpr);
  const displayedSubjects = tutor.subjects.slice(0, 3);
  const locationLabel = [tutor.location.neighborhood, tutor.location.city]
    .filter(Boolean)
    .join(', ') || 'Kathmandu';

  const navigateToProfile = () => {
    onClose();
    router.push(`/tutor/${tutor.uid}` as any);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        {/* Backdrop tap dismisses */}
        <Pressable className="flex-1" onPress={onClose} />

        <Animated.View
          className="bg-surface rounded-t-[20px] px-5 pt-5 pb-8 border-t border-border"
          style={animatedStyle}
        >
          {/* ── Header: Avatar + Info + Close ── */}
          <View className="flex-row justify-between items-start">
            <View className="flex-row items-center flex-1">
              <Avatar
                name={tutor.fullName}
                imageUri={tutor.photoUrl}
                size={52}
              />
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text
                    className="text-body font-semibold text-text-primary mr-1.5"
                    numberOfLines={1}
                  >
                    {tutor.fullName}
                  </Text>
                  {tutor.isVerifiedProfessional && (
                    <View className="bg-verification rounded-pill p-[2px]">
                      <Ionicons name="checkmark" size={10} color="white" />
                    </View>
                  )}
                </View>
                <View className="flex-row items-center mt-0.5">
                  <Ionicons name="location-outline" size={13} color="#6B7268" />
                  <Text
                    className="text-caption text-text-secondary ml-1"
                    numberOfLines={1}
                  >
                    {locationLabel}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="p-1.5 active:opacity-70"
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close" size={22} color="#6B7268" />
            </Pressable>
          </View>

          {/* ── Subjects chips ── */}
          {displayedSubjects.length > 0 && (
            <View className="flex-row flex-wrap mt-3 gap-1.5">
              {displayedSubjects.map((subject) => (
                <View
                  key={subject}
                  className="bg-surface-muted rounded-pill px-3 py-1 border border-border"
                >
                  <Text className="text-caption text-text-secondary">
                    {subject}
                  </Text>
                </View>
              ))}
              {tutor.subjects.length > 3 && (
                <View className="bg-surface-muted rounded-pill px-3 py-1 border border-border">
                  <Text className="text-caption text-text-muted">
                    +{tutor.subjects.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Rate + Rating ── */}
          <View className="flex-row items-center justify-between mt-3 mb-4">
            <Text className="text-body font-bold text-primary">
              NPR {formattedRate}/mo
            </Text>
            {tutor.rating > 0 && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={14} color="#E5A03B" />
                <Text className="text-caption font-medium text-text-primary">
                  {tutor.rating.toFixed(1)}
                </Text>
                {tutor.reviewCount > 0 && (
                  <Text className="text-caption text-text-muted">
                    ({tutor.reviewCount})
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* ── CTA ── */}
          <PrimaryButton
            label="View Profile"
            onPress={navigateToProfile}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}
