import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  serverTimestamp,
  writeBatch,
} from "@react-native-firebase/firestore";

import { AvatarUploader } from "@/components/forms/AvatarUploader";
import { AnimatedPressable, FieldShell, usePressScale } from "@/components/motion";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { motion } from "@/lib/motion";
import { ChipGroup } from "@/components/forms/ChipGroup";
import { LocationField } from "@/components/forms/LocationField";
import { NameEmailFields } from "@/components/forms/NameEmailFields";
import { colors } from "@/constants/colors";
import { useFieldScroll } from "@/hooks/useFieldScroll";
import { registration } from "@/lib/registration";
import { validateEmail, validateFullName, validatePhone, validateUsername } from "@/lib/validation";
import { useAuthStore } from "@/store/authStore";

const GRADES = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade XI (Science)",
  "Grade XI (Management)",
  "Grade XII (Science)",
  "Grade XII (Management)",
] as const;

const SUBJECTS = [
  "Math",
  "Physics",
  "Chemistry",
  "Computer Science",
  "Biology",
  "Nepali",
  "English",
] as const;

type FormErrors = {
  fullName?: string;
  username?: string;
  phone?: string;
  grade?: string;
  subjects?: string;
  location?: string;
  avatar?: string;
};

export function StudentProfileScreen() {
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
  const [grade, setGrade] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [location, setLocation] = useState<{ neighborhood: string; city: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { registerField, scrollToFirstInvalid } = useFieldScroll();

  // The profile picture is a required field, exactly like the others.
  // Exposed as a named flag so it can participate in `canSubmit` and
  // drive `AvatarUploader`'s error/valid visual states.
  const isProfilePictureValid = avatarUri !== null;

  function toggleSubject(option: string) {
    setSubjects((prev) =>
      prev.includes(option) ? prev.filter((s) => s !== option) : [...prev, option],
    );
  }

  const canSubmit =
    fullName.trim().length >= 3 &&
    validateEmail(authEmail) === null &&
    validateUsername(username) === null &&
    validatePhone(phone) === null &&
    grade !== null &&
    subjects.length >= 1 &&
    location !== null &&
    location.city.trim().length > 0 &&
    isProfilePictureValid;

  async function handleSubmit() {
    const validationErrors: FormErrors = {};
    const nameErr = validateFullName(fullName);
    if (nameErr) validationErrors.fullName = nameErr;
    if (validateEmail(authEmail) !== null) {
      Alert.alert(
        "Account email is missing",
        "Please sign in again so we can attach your profile to the verified email.",
      );
      router.replace("/email-signup");
      return;
    }
    const usernameErr = validateUsername(username);
    if (usernameErr) validationErrors.username = usernameErr;
    const phoneErr = validatePhone(phone);
    if (phoneErr) validationErrors.phone = phoneErr;
    if (!grade) validationErrors.grade = "Select your grade.";
    if (subjects.length < 1) validationErrors.subjects = "Select at least one subject.";
    if (!location || !location.city.trim()) {
      validationErrors.location = "Add your location.";
    }
    if (!avatarUri) validationErrors.avatar = "Upload a profile photo to continue.";
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Standard UX: the button stays enabled and a failed submit
      // scrolls to the first incomplete section (document order) so
      // the user immediately sees why they can't continue.
      const sections: string[] = [];
      if (validationErrors.avatar) sections.push("avatar");
      if (validationErrors.fullName) sections.push("nameEmail");
      if (validationErrors.username || validationErrors.phone)
        sections.push("usernamePhone");
      if (validationErrors.grade) sections.push("grade");
      if (validationErrors.subjects) sections.push("subjects");
      if (validationErrors.location) sections.push("location");
      scrollToFirstInvalid(scrollRef, sections);
      return;
    }

    // Cache the draft in the registration shim so the in-flight navigation
    // can read it before Firestore round-trip completes. The shim will be
    // removed once Zustand + AsyncStorage persist lands in Phase 4.
    registration.updateProfile({
      fullName: fullName.trim(),
      email: authEmail.trim(),
      username: username.trim(),
      phone: phone.trim(),
      grade,
      subjects,
      location,
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
      // half-saved state (root doc says "student" but subcollection
      // is empty, or vice versa). `writeBatch` commits all writes
      // together or fails the whole batch — there is no partial
      // success. Both writes use `set` with only the fields we want
      // to write, and we include `uid` on the root doc so the
      // `request.resource.data.uid == userId` guard in
      // firestore.rules passes on first-create AND on update.
      //
      //   1. Root user doc — stamps `role: "student"` so the layout
      //      guard in `app/_layout.tsx` can route a returning user
      //      straight to the dashboard. `RoleSelection` already wrote
      //      this, but if the user landed here via a different path
      //      (e.g. Google sign-in linking an existing email+password
      //      account) the root doc may not have a role yet, and we
      //      want the post-onboarding state to be self-consistent.
      //
      //   2. Subcollection doc — the actual profile metadata. Per
      //      Documentation/04-Firebase/phase-3-notes.md §3, the
      //      student profile lives at
      //      `users/{uid}/studentProfile/default` (not on the user
      //      doc itself, so it can be re-written cheaply on every
      //      "Edit profile" save without touching auth metadata).
      const userRef = doc(db, "users", user.uid);
      const profileRef = doc(db, "users", user.uid, "studentProfile", "default");
      const now = serverTimestamp();
      const batch = writeBatch(db);
      batch.set(
        userRef,
        {
          uid: user.uid,
          email: authEmail.trim(),
          role: "student",
          updatedAt: now,
        },
        { merge: true },
      );
      batch.set(
        profileRef,
        {
          grade,
          subjects,
          location,
          fullName: fullName.trim(),
          email: authEmail.trim(),
          username: username.trim(),
          phone: phone.trim(),
          // `photoUrl` is the Supabase public URL returned by
          // `uploadAvatar()` after the user picks a photo. Persist
          // it here so the student profile tab (and any future
          // marketplace cards) can render it without re-uploading.
          // A profile without a photo is a valid state — we skip
          // the field when no image was picked so we never write
          // `null` (which would clobber a real URL on a subsequent
          // edit).
          ...(avatarUri ? { photoUrl: avatarUri } : {}),
          updatedAt: now,
        },
        { merge: true },
      );
      await batch.commit();
      // Mirror the role into the local store so the layout guard
      // advances to the dashboard on the next render (the doc-fetch
      // listener will also pick this up, but committing it here
      // makes the navigation feel instant).
      useAuthStore.getState().setRole("student");
      router.replace("/student-home");
    } catch (error: any) {
      console.error("StudentProfileScreen: failed to save profile", error);
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

  return (
    <ScreenLayout variant="night">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="gap-1 px-5 pt-4 pb-8 bg-night">
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => {
              // If the user's role was read from Firestore (returning
              // user), route to the dashboard. Otherwise (first-time
              // user), clear the local role so the layout guard routes
              // to /role-selection instead of bouncing back to the
              // dashboard — and the user can abort the onboarding flow.
              const hasExisting = useAuthStore.getState().hasExistingRole;
              const currentRole = useAuthStore.getState().role;
              if (hasExisting && currentRole) {
                router.replace("/student-home");
              } else {
                // First-time user: clear the locally-set role so the
                // layout guard sees `!role` and routes to
                // /role-selection. The user can then use the Alert
                // dialog's "Sign out" option to leave cleanly.
                useAuthStore.getState().setRole(null);
                router.replace("/role-selection");
              }
            }}
            className="min-h-touch self-start flex-row items-center gap-1 -ml-1 active:opacity-70"
          >
            <Ionicons color={colors.text.inverse} name="chevron-back" size={18} />
            <Text className="text-body text-white opacity-80">Back</Text>
          </Pressable>
          <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start', marginBottom: 4 }}>
            <Text className="text-display text-white">
              Set up your profile
            </Text>
          </View>
          <Text className="text-body text-white opacity-70 mt-0.5">
            This helps tutors understand your learning needs.
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="flex-grow gap-6 px-5 pt-8 pb-10 bg-background"
          keyboardShouldPersistTaps="handled"
        >
          <View onLayout={registerField("avatar")}>
            <AvatarUploader
              value={avatarUri}
              onChange={setAvatarUri}
              error={!isProfilePictureValid}
              valid={isProfilePictureValid}
              errorMessage={errors.avatar}
            />
          </View>

          <View onLayout={registerField("nameEmail")}>
            <NameEmailFields
              fullName={fullName}
              email={authEmail}
              emailDisabled
              errors={errors}
              fullNameValid={
                fullName.trim().length > 0 && validateFullName(fullName) === null
              }
              fullNameError={!!errors.fullName}
              onChangeFullName={setFullName}
              onChangeEmail={() => {
                /* email is locked — sourced from verified auth identity */
              }}
            />
          </View>

          <View onLayout={registerField("usernamePhone")}>
            <Card className="gap-4">
              <Text className="text-label text-ink-muted">
                Username & phone
              </Text>
            <View className="gap-1">
              <Text className="text-caption text-text-secondary">
                Username (3–30 chars: letters, digits, _ or .)
              </Text>
              <FieldShell
                value={username}
                error={!!errors.username}
                valid={
                  username.length > 0 && validateUsername(username) === null
                }
                className="h-input bg-surface rounded-card"
              >
                {({ onFocus, onBlur }) => (
                  <View className="h-input flex-row items-center px-3 gap-2">
                    <Ionicons color={colors.text.muted} name="at-outline" size={18} />
                    <TextInput
                      className="flex-1 text-text-primary text-body"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={setUsername}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder="your_handle"
                      placeholderTextColor={colors.text.muted}
                      value={username}
                    />
                  </View>
                )}
              </FieldShell>
              {errors.username ? (
                <Text className="text-caption text-danger">{errors.username}</Text>
              ) : null}
            </View>
            <View className="gap-1">
              <Text className="text-caption text-text-secondary">
                Phone (digits only — for parents to reach tutors)
              </Text>
              <FieldShell
                value={phone}
                error={!!errors.phone}
                valid={
                  phone.length > 0 && validatePhone(phone) === null
                }
                className="h-input bg-surface rounded-card"
              >
                {({ onFocus, onBlur }) => (
                  <View className="h-input flex-row items-center px-3 gap-2">
                    <Ionicons color={colors.text.muted} name="call-outline" size={18} />
                    <TextInput
                      className="flex-1 text-text-primary text-body"
                      keyboardType="phone-pad"
                      onChangeText={setPhone}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder="98XXXXXXXX"
                      placeholderTextColor={colors.text.muted}
                      value={phone}
                    />
                  </View>
                )}
              </FieldShell>
              {errors.phone ? (
                <Text className="text-caption text-danger">{errors.phone}</Text>
              ) : null}
            </View>
            </Card>
          </View>

          <View onLayout={registerField("grade")}>
            <Card className="gap-4">
              <Text className="text-label text-ink-muted">
                Grade / class
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {GRADES.map((item) => (
                  <GradeChip
                    key={item}
                    item={item}
                    active={grade === item}
                    onPress={() => setGrade(item)}
                  />
                ))}
              </View>
              {errors.grade ? (
                <Text className="text-caption text-danger -mt-1">{errors.grade}</Text>
              ) : null}
            </Card>
          </View>

          <View onLayout={registerField("subjects")}>
            <ChipGroup
              label="Subjects needed"
              options={SUBJECTS}
              selected={subjects}
              onToggle={toggleSubject}
              error={errors.subjects}
            />
          </View>

          <View onLayout={registerField("location")}>
            <LocationField value={location} onChange={setLocation} />
            {errors.location ? (
              <Text className="text-caption text-danger mt-1">
                {errors.location}
              </Text>
            ) : null}
          </View>
          <View className="w-full mt-6">
            <PrimaryButton
              label={isSaving ? "Saving..." : "Finish setup"}
              onPress={handleSubmit}
              variant="accent"
              size="lg"
              loading={isSaving}
              disabled={isSaving}
              className="w-full"
            />
            {!canSubmit && !isSaving ? (
              <Text className="text-caption text-text-muted text-center mt-2">
                Some required fields are incomplete — tap Finish setup to
                see what&apos;s missing.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

function GradeChip({
  item,
  active,
  onPress,
}: {
  item: string;
  active: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.chipPressed,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className={`min-h-btn-sm px-4 py-2 rounded-sm border ${
        active ? "bg-primary border-primary" : "bg-surface-muted border-border"
      }`}
    >
      <Text
        className={`text-button-sm ${
          active ? "text-white" : "text-text-secondary"
        }`}
      >
        {item}
      </Text>
    </AnimatedPressable>
  );
}
