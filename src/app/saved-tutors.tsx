/**
 * EdumentX — Saved Tutors screen
 *
 * Live list of the tutors the student hearted from a tutor profile.
 * Saved ids come from the `savedTutors` map on the student's own
 * profile doc (`users/{uid}/studentProfile/default`); tutor cards
 * come from the same approved-tutor feed the home screen uses, so
 * cards stay fresh when a tutor is re-verified or hidden.
 *
 * Tapping a card opens `/tutor/[id]`; the heart on each card unsaves
 * the tutor (the toggle writes immediately, mirroring the details
 * screen's heart).
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { TutorCard } from "@/components/domain/TutorCard";
import { createDefaultTutorProfile } from "@/lib/tutor/types";
import { useAuthStore } from "@/store/authStore";
import {
  getTutorRepository,
  type TutorListing,
} from "@/services/tutors/dataSource";
import { getSavedTutorsRepository } from "@/services/savedTutors/dataSource";

export default function SavedTutorsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const savedRepo = getSavedTutorsRepository();
  const tutorRepo = getTutorRepository();

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [tutors, setTutors] = useState<TutorListing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    const unsub = savedRepo.subscribeSavedTutorIds(
      user.uid,
      (ids) => {
        setSavedIds(ids);
        setLoaded(true);
      },
      (err) => {
        console.warn("SavedTutors: subscribe failed", err);
        setLoaded(true);
      },
    );
    return unsub;
  }, [user, savedRepo]);

  useEffect(() => {
    const unsub = tutorRepo.subscribeTutors(
      (list) => setTutors(list),
      (err) => console.warn("SavedTutors: tutor feed failed", err),
    );
    return unsub;
  }, [tutorRepo]);

  // Preserve the saved order (map insertion order = the order the
  // student saved them) instead of re-sorting by the feed.
  const saved = useMemo(() => {
    const byUid = new Map(tutors.map((t) => [t.uid, t]));
    return savedIds
      .map((uid) => byUid.get(uid))
      .filter((t): t is TutorListing => t !== undefined);
  }, [tutors, savedIds]);

  function handleUnsave(uid: string) {
    if (!user) return;
    // Optimistic — the onSnapshot round-trip reconciles if the write
    // fails.
    setSavedIds((prev) => prev.filter((id) => id !== uid));
    savedRepo
      .toggleSavedTutor(user.uid, uid, true)
      .catch((err) => console.warn("SavedTutors: unsave failed", err));
  }

  return (
    <ScreenLayout variant="background">
      <ScreenHeader variant="light">
        <View className="flex-row items-center justify-between">
          <View className="self-start border-b-2 border-accent pb-0.5">
            <Text className="text-display text-text-primary">
              Saved tutors
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="w-9 h-9 rounded-pill bg-background border border-border items-center justify-center active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} color="#2F5D50" />
          </Pressable>
        </View>
        <Text className="text-body text-text-secondary mt-0.5">
          {loaded
            ? `${saved.length} tutor${saved.length === 1 ? "" : "s"} saved`
            : "Loading saved tutors…"}
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1 bg-background">
        {!loaded ? (
          <View className="items-center justify-center pt-16">
            <ActivityIndicator size="small" color="#2F5D50" />
          </View>
        ) : saved.length === 0 ? (
          <View className="items-center justify-center pt-16 px-6">
            <View className="w-14 h-14 rounded-pill bg-accent-soft items-center justify-center mb-3">
              <Ionicons name="heart-outline" size={26} color="#E5A03B" />
            </View>
            <Text className="text-card-title font-medium text-text-primary text-center">
              No saved tutors yet
            </Text>
            <Text className="text-body-sm text-text-muted text-center mt-1.5">
              Tap the heart on any tutor profile to keep them here.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {saved.map((tutor) => (
              <TutorCard
                key={tutor.uid}
                tutor={createDefaultTutorProfile({
                  id: tutor.uid,
                  fullName: tutor.fullName,
                  username: tutor.username,
                  headline: tutor.headline,
                  subjects: tutor.subjects,
                  yearsExperience: tutor.yearsExperience,
                  monthlyRateNpr: tutor.monthlyRateNpr,
                  location: tutor.location,
                  rating: tutor.rating,
                  reviewCount: tutor.reviewCount,
                  isVerifiedProfessional: tutor.isVerifiedProfessional,
                  photoUrl: tutor.photoUrl,
                })}
                variant="wide"
                saved
                onSaveToggle={() => handleUnsave(tutor.uid)}
              />
            ))}
          </View>
        )}
      </ScreenScroll>
    </ScreenLayout>
  );
}
