import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  serverTimestamp,
  writeBatch,
} from "@react-native-firebase/firestore";

import { AvatarUploader } from "@/components/forms/AvatarUploader";
import { ChipGroup } from "@/components/forms/ChipGroup";
import { LocationField } from "@/components/forms/LocationField";
import { NameEmailFields } from "@/components/forms/NameEmailFields";
import { colors } from "@/constants/colors";
import { registration } from "@/lib/registration";
import { useAuthStore } from "@/store/authStore";

const SUBJECTS = [
  "Math",
  "Physics",
  "Chemistry",
  "Computer Science",
  "Biology",
  "Nepali",
  "English",
] as const;

const GRADES = [
  "Grade 1-5",
  "Grade 6-8",
  "Grade 9-10",
  "Grade XI (Science)",
  "Grade XI (Management)",
  "Grade XII (Science)",
  "Grade XII (Management)",
  "Test Prep",
  "Language",
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;
const PHONE_REGEX = /^\d{7,15}$/;
const HEADLINE_MAX = 80;
const BIO_MAX = 280;

type FormErrors = {
  fullName?: string;
  username?: string;
  phone?: string;
  headline?: string;
  subjects?: string;
  grades?: string;
  experience?: string;
  monthlyRate?: string;
  location?: string;
};

const inputBase =
  "min-h-btn px-4 border-emphasis rounded-card bg-surface text-text-primary text-body-lg";

export function TutorProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  // Email comes from the verified Firebase Auth identity and is
  // locked here — see `NameEmailFields` `emailDisabled`. Editing the
  // profile email would create a mismatch with the auth provider.
  const authEmail = user?.email ?? "";
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [gradesTeaching, setGradesTeaching] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState(0);
  const [monthlyRateNpr, setMonthlyRateNpr] = useState("");
  const [location, setLocation] = useState<{ neighborhood: string; city: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  function toggleSubject(option: string) {
    setSubjects((prev) =>
      prev.includes(option) ? prev.filter((s) => s !== option) : [...prev, option],
    );
  }

  function toggleGrade(option: string) {
    setGradesTeaching((prev) =>
      prev.includes(option) ? prev.filter((g) => g !== option) : [...prev, option],
    );
  }

  const monthlyRateNumber = Number(monthlyRateNpr);
  const isValidRate =
    monthlyRateNpr.trim().length > 0 &&
    !Number.isNaN(monthlyRateNumber) &&
    monthlyRateNumber >= 0;

  const canSubmit =
    fullName.trim().length >= 3 &&
    EMAIL_REGEX.test(authEmail.trim()) &&
    USERNAME_REGEX.test(username.trim()) &&
    PHONE_REGEX.test(phone.trim()) &&
    headline.trim().length > 0 &&
    subjects.length >= 1 &&
    gradesTeaching.length >= 1 &&
    isValidRate &&
    location !== null &&
    location.city.trim().length > 0;

  async function handleSubmit() {
    const validationErrors: FormErrors = {};
    if (fullName.trim().length < 3) validationErrors.fullName = "Enter your full name.";
    if (!EMAIL_REGEX.test(authEmail.trim())) {
      Alert.alert(
        "Account email is missing",
        "Please sign in again so we can attach your profile to the verified email.",
      );
      router.replace("/email-signup");
      return;
    }
    if (!USERNAME_REGEX.test(username.trim())) {
      validationErrors.username =
        "Username must be 3–30 characters: letters, digits, underscore, or dot.";
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      validationErrors.phone =
        "Enter a valid phone number (7–15 digits, no country code).";
    }
    if (headline.trim().length === 0) validationErrors.headline = "Add a one-line headline that parents will see.";
    if (subjects.length < 1) validationErrors.subjects = "Select at least one subject you teach.";
    if (gradesTeaching.length < 1) validationErrors.grades = "Select at least one grade level you teach.";
    if (!isValidRate) validationErrors.monthlyRate = "Enter your monthly rate in NPR.";
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    const phoneDisplay = phone.trim() ? `+977 ${phone.trim()}` : "";

    // Cache the draft in the registration shim so the in-flight navigation
    // can read it before Firestore round-trip completes. The shim will be
    // removed once Zustand + AsyncStorage persist lands in Phase 4.
    registration.updateProfile({
      fullName: fullName.trim(),
      email: authEmail.trim(),
      username: username.trim(),
      phone: phone.trim(),
      subjects,
      location,
      phoneDisplay,
      headline: headline.trim(),
      bio: bio.trim(),
      gradesTeaching,
      yearsExperience,
      monthlyRateNpr: monthlyRateNumber,
    });

    if (!user) {
      Alert.alert(
        "Not signed in",
        "Please sign in (email or Google) before completing your profile.",
      );
      router.replace("/email-signup");
      return;
    }

    setIsSaving(true);
    try {
      // Modular RNFirebase v22+ API: getFirestore + doc + writeBatch +
      // serverTimestamp, not firestore().collection().doc().set(). The
      // namespaced form logs a deprecation warning on every call.
      const db = getFirestore(getApp());
      // Two writes, committed atomically so the user is never in a
      // half-saved state (root doc says "tutor" but subcollection is
      // empty, or vice versa). `writeBatch` commits all writes
      // together or fails the whole batch — there is no partial
      // success. We include `uid` on the root doc so the
      // `request.resource.data.uid == userId` guard in
      // firestore.rules passes on first-create AND on update.
      //
      //   1. Root user doc — stamps `role: "tutor"` so the layout
      //      guard in `app/_layout.tsx` can route a returning user
      //      straight to the dashboard. `RoleSelection` already wrote
      //      this, but if the user landed here via a different path
      //      (e.g. Google sign-in linking an existing email+password
      //      account) the root doc may not have a role yet, and we
      //      want the post-onboarding state to be self-consistent.
      //
      //   2. Subcollection doc — the actual profile metadata. Per
      //      Documentation/04-Firebase/phase-3-notes.md §3, the tutor
      //      profile lives at `users/{uid}/tutorProfile/default` (not
      //      on the user doc itself, so it can be re-written cheaply
      //      on every "Edit profile" save without touching auth
      //      metadata).
      const userRef = doc(db, "users", user.uid);
      const profileRef = doc(db, "users", user.uid, "tutorProfile", "default");
      const now = serverTimestamp();
      const batch = writeBatch(db);
      batch.set(
        userRef,
        {
          uid: user.uid,
          email: authEmail.trim(),
          role: "tutor",
          updatedAt: now,
        },
        { merge: true },
      );
      batch.set(
        profileRef,
        {
          subjects,
          gradesTeaching,
          yearsExperience,
          // Field name is `monthlyRateNpr` — the marketplace presents
          // tutor pricing as a flat monthly figure so parents can
          // budget without doing arithmetic. The legacy `hourlyRateNpr`
          // field was renamed in the June 21, 2026 pivot.
          monthlyRateNpr: monthlyRateNumber,
          location,
          headline: headline.trim(),
          bio: bio.trim(),
          phoneDisplay,
          phone: phone.trim(),
          username: username.trim(),
          fullName: fullName.trim(),
          email: authEmail.trim(),
          // `photoUrl` is the Supabase public URL returned by
          // `uploadAvatar()` after the user picks a photo. We
          // persist it on the profile doc so the tutor profile tab
          // (and any future marketplace cards) can render it
          // without re-uploading. A profile without a photo is a
          // valid state — we skip the field when no image was
          // picked so we never write `null` (which would clobber a
          // real URL on a subsequent edit).
          ...(avatarUri ? { photoUrl: avatarUri } : {}),
          updatedAt: now,
        },
        { merge: true },
      );
      await batch.commit();
      // Mirror the role into the local store so the layout guard
      // advances to the dashboard on the next render.
      useAuthStore.getState().setRole("tutor");
      router.replace("/tutor-home");
    } catch (error: any) {
      console.error("TutorProfileScreen: failed to save profile", error);
      // Surface the actual Firebase error code so the user (and any
      // support agent) can tell at a glance whether this is a rules
      // mismatch (`permission-denied`), a network problem, or a bug.
      // Without this we silently route forward and the user thinks
      // their profile was saved.
      const code = error?.code ? `\n\nError code: ${error.code}` : "";
      Alert.alert(
        "Could not save profile",
        `${error?.message ?? "Please check your connection and try again."}${code}`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  function adjustExperience(delta: number) {
    setYearsExperience((current) => Math.max(0, Math.min(50, current + delta)));
  }

  return (
    <SafeAreaView className="flex-1 bg-night">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="gap-1 px-5 pt-4 pb-12 bg-night">
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.replace("/role-selection")}
            className="min-h-touch self-start flex-row items-center gap-1 -ml-1 active:opacity-70"
          >
            <Ionicons color={colors.text.inverse} name="chevron-back" size={18} />
            <Text className="text-body text-white opacity-80">Back</Text>
          </Pressable>
          <Text className="text-header-title text-white">
            Set up your tutor profile
          </Text>
          <Text className="text-body text-white opacity-70 mt-0.5">
            This is what parents will see on the map. You can update everything later.
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow gap-6 px-5 pt-8 pb-10 bg-background"
          keyboardShouldPersistTaps="handled"
        >
          <AvatarUploader value={avatarUri} onChange={setAvatarUri} />

          <NameEmailFields
            fullName={fullName}
            email={authEmail}
            emailDisabled
            errors={errors}
            onChangeFullName={setFullName}
            onChangeEmail={() => {
              /* email is locked — sourced from verified auth identity */
            }}
          />

          {/* Username + phone (editable — for parent-initiated contact) */}
          <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <Text className="text-overline text-text-muted uppercase">
              Username & phone
            </Text>
            <View className="gap-1">
              <Text className="text-caption text-text-secondary">
                Username (3–30 chars: letters, digits, _ or .)
              </Text>
              <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3 gap-2">
                <Ionicons color={colors.text.muted} name="at-outline" size={18} />
                <TextInput
                  className="flex-1 text-text-primary text-body"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setUsername}
                  placeholder="your_handle"
                  placeholderTextColor={colors.text.muted}
                  value={username}
                />
              </View>
              {errors.username ? (
                <Text className="text-caption text-danger">{errors.username}</Text>
              ) : null}
            </View>
            <View className="gap-1">
              <Text className="text-caption text-text-secondary">
                Phone (digits only — parents can request a call from inside the app)
              </Text>
              <View className="h-btn flex-row items-center border border-border rounded-md bg-surface px-3 gap-2">
                <Ionicons color={colors.text.muted} name="call-outline" size={18} />
                <TextInput
                  className="flex-1 text-text-primary text-body"
                  keyboardType="phone-pad"
                  onChangeText={setPhone}
                  placeholder="98XXXXXXXX"
                  placeholderTextColor={colors.text.muted}
                  value={phone}
                />
              </View>
              {errors.phone ? (
                <Text className="text-caption text-danger">{errors.phone}</Text>
              ) : null}
            </View>
          </View>

          {/* Headline */}
          <View className="gap-1 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-overline text-text-muted uppercase">Headline</Text>
              <Text className="text-caption text-text-muted">
                {headline.length}/{HEADLINE_MAX}
              </Text>
            </View>
            <TextInput
              value={headline}
              onChangeText={(value) => setHeadline(value.slice(0, HEADLINE_MAX))}
              placeholder="e.g., Experienced Math & Physics tutor | SEE graduate"
              placeholderTextColor={colors.text.muted}
              className={`${inputBase} ${
                errors.headline ? "border-danger" : "border-border"
              }`}
            />
            {errors.headline ? (
              <Text className="text-caption text-danger">{errors.headline}</Text>
            ) : null}
          </View>

          {/* Bio */}
          <View className="gap-1 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-overline text-text-muted uppercase">
                About you (optional)
              </Text>
              <Text className="text-caption text-text-muted">
                {bio.length}/{BIO_MAX}
              </Text>
            </View>
            <TextInput
              value={bio}
              onChangeText={(value) => setBio(value.slice(0, BIO_MAX))}
              placeholder="Tell parents about your teaching style, experience, and approach."
              placeholderTextColor={colors.text.muted}
              multiline
              numberOfLines={4}
              className="min-h-bio-area px-4 py-3 border-emphasis border-border rounded-card bg-surface text-text-primary text-body-lg"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          <ChipGroup
            label="Subjects you teach"
            options={SUBJECTS}
            selected={subjects}
            onToggle={toggleSubject}
            error={errors.subjects}
          />

          <ChipGroup
            label="Grade levels you teach"
            options={GRADES}
            selected={gradesTeaching}
            onToggle={toggleGrade}
            error={errors.grades}
          />

          {/* Stepper + rate */}
          <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <View className="gap-1">
              <Text className="text-overline text-text-muted uppercase">
                Years of experience
              </Text>
              <View className="flex-row items-center gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Decrease years of experience"
                  onPress={() => adjustExperience(-1)}
                  disabled={yearsExperience === 0}
                  className="w-11 h-11 rounded-full bg-background border-emphasis border-border items-center justify-center active:opacity-70"
                >
                  <Ionicons color={colors.text.primary} name="remove" size={20} />
                </Pressable>
                <View className="flex-1 items-center">
                  <Text className="text-stepper-value text-text-primary">
                    {yearsExperience}
                  </Text>
                  <Text className="text-caption text-text-muted">
                    {yearsExperience === 1 ? "year" : "years"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Increase years of experience"
                  onPress={() => adjustExperience(1)}
                  disabled={yearsExperience === 50}
                  className="w-11 h-11 rounded-full bg-background border-emphasis border-border items-center justify-center active:opacity-70"
                >
                  <Ionicons color={colors.text.primary} name="add" size={20} />
                </Pressable>
              </View>
            </View>

            <View className="gap-1">
              <Text className="text-overline text-text-muted uppercase">
                Monthly rate (NPR)
              </Text>
              <View
                className={`flex-row items-center h-rate-row px-3 border-emphasis rounded-card bg-surface gap-1 ${
                  errors.monthlyRate ? "border-danger" : "border-border"
                }`}
              >
                <Text className="text-body text-text-muted font-semibold">Rs.</Text>
                <TextInput
                  value={monthlyRateNpr}
                  onChangeText={setMonthlyRateNpr}
                  placeholder="10000"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="numeric"
                  className="flex-1 text-text-primary text-body-lg font-semibold"
                />
                <Text className="text-caption text-text-muted">/ month</Text>
              </View>
              {errors.monthlyRate ? (
                <Text className="text-caption text-danger">{errors.monthlyRate}</Text>
              ) : null}
            </View>
          </View>

          <LocationField value={location} onChange={setLocation} />

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit || isSaving}
            onPress={handleSubmit}
            className="min-h-btn-lg mt-4 rounded-card items-center justify-center shadow-md bg-amber active:opacity-90 active:scale-[0.98] disabled:bg-border-strong disabled:opacity-60 self-center w-full max-w-sm"
          >
            <Text className="text-button text-base font-semibold text-white disabled:text-text-muted">
              {isSaving ? "Saving..." : "Finish setup"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
