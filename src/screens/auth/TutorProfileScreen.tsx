import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  doc,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from "@react-native-firebase/firestore";
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
  View
} from "react-native";

import { AvatarUploader } from "@/components/forms/AvatarUploader";
import { ChipGroup } from "@/components/forms/ChipGroup";
import { DocumentUploader } from "@/components/forms/DocumentUploader";
import { LocationField } from "@/components/forms/LocationField";
import { NameEmailFields } from "@/components/forms/NameEmailFields";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { AnimatedPressable, FieldShell, usePressScale } from "@/components/motion";
import { ScreenLayout } from "@/components/shared/ScreenLayout";
import { Card } from "@/components/ui/Card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { useFieldScroll } from "@/hooks/useFieldScroll";
import { INSTITUTION_LABELS } from "@/data/institutions";
import { QUALIFICATION_LABELS } from "@/data/qualifications";
import { motion } from "@/lib/motion";
import { registration } from "@/lib/registration";
import { validateDegree, validateEmail, validateFullName, validateInstitution, validatePhone, validateUsername } from "@/lib/validation";
import type { TutorDocument } from "@/lib/verification/documents";
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
  degree?: string;
  institution?: string;
  avatar?: string;
};

const inputBase =
  "min-h-btn px-4 rounded-card bg-surface text-text-primary text-body-lg";

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
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(null);
  const [monthlyRateNpr, setMonthlyRateNpr] = useState("");
  const [location, setLocation] = useState<{ neighborhood: string; city: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { registerField, scrollToFirstInvalid } = useFieldScroll();

  // The profile picture is a required field, exactly like the others.
  // Exposed as a named flag so it can participate in `canSubmit` and
  // drive `AvatarUploader`'s error/valid visual states.
  const isProfilePictureValid = avatarUri !== null;

  /**
   * Three verification documents. Two required (citizenship,
   * academic certificate) and one optional (demo teaching video).
   * Stored as `TutorDocument[]` and persisted to both
   * `tutorVerifications/{uid}.documents` (the source of truth) and
   * `users/{uid}/tutorProfile/default.documents` (the cache the
   * tutor's own edit screen reads from). Both writes happen in the
   * same `writeBatch` so the two never disagree.
   *
   * We keep docs in a `Map` keyed by `kind` so re-uploading one
   * kind doesn't disturb the others. The Map serializes to a flat
   * array for the Firestore write.
   */
  const [documents, setDocuments] = useState<Map<string, TutorDocument>>(
    () => new Map(),
  );
  const citizenshipDoc = documents.get("citizenship") ?? null;
  const certificateDoc = documents.get("certificate") ?? null;
  const demoDoc = documents.get("demo") ?? null;

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

  // Two verification docs are required before submit; the demo
  // video is optional so it doesn't block the user.
  const hasCitizenship = documents.has("citizenship");
  const hasCertificate = documents.has("certificate");

  const canSubmit =
    fullName.trim().length >= 3 &&
    validateEmail(authEmail) === null &&
    validateUsername(username) === null &&
    validatePhone(phone) === null &&
    headline.trim().length > 0 &&
    subjects.length >= 1 &&
    gradesTeaching.length >= 1 &&
    isValidRate &&
    location !== null &&
    location.city.trim().length > 0 &&
    validateDegree(degree) === null &&
    validateInstitution(institution) === null &&
    hasCitizenship &&
    hasCertificate &&
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
    if (headline.trim().length === 0) validationErrors.headline = "Add a one-line headline that parents will see.";
    if (subjects.length < 1) validationErrors.subjects = "Select at least one subject you teach.";
    if (gradesTeaching.length < 1) validationErrors.grades = "Select at least one grade level you teach.";
    if (!isValidRate) validationErrors.monthlyRate = "Enter your monthly rate in NPR.";
    const degreeErr = validateDegree(degree);
    if (degreeErr) validationErrors.degree = degreeErr;
    const institutionErr = validateInstitution(institution);
    if (institutionErr) validationErrors.institution = institutionErr;
    if (!hasCitizenship) {
      Alert.alert(
        "Citizenship ID required",
        "Please upload a clear photo of your citizenship card before submitting.",
      );
    }
    if (!hasCertificate) {
      Alert.alert(
        "Academic certificate required",
        "Please upload a degree, transcript, or enrollment letter before submitting.",
      );
    }
    if (!location || !location.city.trim()) {
      validationErrors.location = "Add your location.";
    }
    if (!avatarUri) validationErrors.avatar = "Upload a profile photo to continue.";
    setErrors(validationErrors);
    if (!hasCitizenship || !hasCertificate) return;
    if (Object.keys(validationErrors).length > 0) {
      // Standard UX: the button stays enabled and a failed submit
      // scrolls to the first incomplete section (document order) so
      // the user immediately sees why they can't continue.
      const sections: string[] = [];
      if (validationErrors.avatar) sections.push("avatar");
      if (validationErrors.fullName) sections.push("nameEmail");
      if (validationErrors.username || validationErrors.phone)
        sections.push("usernamePhone");
      if (validationErrors.headline) sections.push("headline");
      if (validationErrors.degree || validationErrors.institution)
        sections.push("credentials");
      if (validationErrors.subjects) sections.push("subjects");
      if (validationErrors.grades) sections.push("grades");
      if (validationErrors.monthlyRate) sections.push("rate");
      if (validationErrors.location) sections.push("location");
      scrollToFirstInvalid(scrollRef, sections);
      return;
    }

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
      degree: degree.trim(),
      institution: institution.trim(),
      gender,
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
      // Three writes, committed atomically so the user is never in a
      // half-saved state. `writeBatch` commits all writes together
      // or fails the whole batch — there is no partial success. We
      // include `uid` on the root doc so the
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
      //      metadata). This doc also carries the denormalized
      //      `verificationStatus` / `hasPendingUpdate` flags so the
      //      layout guard and the tutor dashboard can read everything
      //      they need in a single `onSnapshot` without joining across
      //      collections. The source of truth for admin actions is
      //      `tutorVerifications/{uid}` (write 3 below); the flags
      //      here are a cache.
      //
      //   3. Verification doc — a `pending` entry in
      //      `tutorVerifications/{uid}`. The admin queue reads this
      //      collection (filtered by `status in {pending, more_info}`)
      //      to list new tutor signups awaiting review. Creating it
      //      atomically with the profile means the admin sees the
      //      tutor the moment they finish onboarding — there is no
      //      race where a tutor has a profile but no verification
      //      doc (which would silently fall off the admin's radar).
      const userRef = doc(db, "users", user.uid);
      const profileRef = doc(db, "users", user.uid, "tutorProfile", "default");
      const verificationRef = doc(db, "tutorVerifications", user.uid);
      const now = serverTimestamp();

      const batch = writeBatch(db);
      const documentsArray = Array.from(documents.values());
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
          gender,
          // Field name is `monthlyRateNpr` — the marketplace presents
          // tutor pricing as a flat monthly figure so parents can
          // budget without doing arithmetic. The legacy `hourlyRateNpr`
          // field was renamed in the June 21, 2026 pivot.
          monthlyRateNpr: monthlyRateNumber,
          location,
          headline: headline.trim(),
          bio: bio.trim(),
          phoneDisplay,
          degree: degree.trim(),
          institution: institution.trim(),
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
          // Verification docs (citizenship / certificate / demo).
          // Persisted on the profile doc as a denormalized cache so
          // the tutor's own edit screen can show "you already
          // uploaded X" without a second `getDoc`. The source of
          // truth is `tutorVerifications/{uid}.documents` (the
          // admin queue reads from that).
          documents: documentsArray,
          // Denormalized verification flags. The admin's
          // `tutorVerifications/{uid}` doc is the source of truth
          // for the status; these flags are a cache so the layout
          // guard and the tutor dashboard don't need a second
          // `getDoc` per render. Mirrored in `app/_layout.tsx`'s
          // boot-migration block and in the admin queue's
          // approve / reject handlers.
          verificationStatus: "pending",
          isVerifiedProfessional: false,
          rejectionReason: null,
          hasPendingUpdate: false,
          updatedAt: now,
        },
        { merge: true },
      );
      batch.set(
        verificationRef,
        {
          uid: user.uid,
          email: authEmail.trim(),
          fullName: fullName.trim(),
          degree: degree.trim(),
          institution: institution.trim(),
          subjects,
          gradesTeaching,
          yearsExperience,
          gender,
          monthlyRateNpr: monthlyRateNumber,
          location,
          headline: headline.trim(),
          bio: bio.trim(),
          phone: phone.trim(),
          phoneDisplay,
          // Mirror the profile photo URL onto the verification doc
          // so the admin queue can render the tutor's avatar. The
          // queue reads `data.photoUrl ?? data.avatarUrl`.
          ...(avatarUri ? { photoUrl: avatarUri } : {}),
          status: "pending",
          // `adminNotes` is the rejection reason / info-request
          // text captured by the admin from the RejectReasonDialog
          // (see `screens/admin/VerificationQueue.tsx`). Empty on
          // first submission.
          adminNotes: null,
          reviewedBy: null,
          reviewedAt: null,
          // Source-of-truth list of uploaded verification documents.
          // Mirrored onto the profile doc above so the tutor's
          // own dashboard can render it without a second `getDoc`.
          documents: documentsArray,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      await batch.commit();
      // Mirror the role + verification status into the local store
      // so the layout guard in `app/_layout.tsx` keeps the tutor
      // on `/tutor-pending` (NOT `/tutor-home`) until the admin
      // approves. Without this, a brand-new tutor who just finished
      // onboarding would land on the real dashboard and see the
      // dashboard's `ReviewBanner` — which the mid-term spec
      // explicitly disallows (we want them fully gated out of
      // /tutor-home until they're a verified professional).
      useAuthStore.getState().setRole("tutor");
      useAuthStore.getState().setTutorVerificationStatus("pending");
      router.replace("/tutor-pending");
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
              // tutor, e.g. a rejected tutor resubmitting), route to
              // the tutor dashboard. Otherwise (first-time user),
              // clear the local role so the layout guard routes to
              // /role-selection — and the user can abort onboarding.
              const hasExisting = useAuthStore.getState().hasExistingRole;
              const currentRole = useAuthStore.getState().role;
              if (hasExisting && currentRole) {
                router.replace("/tutor-home");
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
              Set up your tutor profile
            </Text>
          </View>
          <Text className="text-body text-white opacity-70 mt-0.5">
            This is what parents will see on the map. You can update everything later.
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

          {/* Username + phone (editable — for parent-initiated contact) */}
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
                Phone (digits only — parents can request a call from inside the app)
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

          {/* Gender radio group */}
          <Card className="gap-3">
            <Text className="text-label text-ink-muted">Gender</Text>
            <Text className="text-caption text-text-secondary -mt-2">
              Students can filter tutors by gender preference.
            </Text>
            <View className="flex-row gap-3">
              {(["male", "female", "other"] as const).map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: gender === option }}
                  onPress={() => setGender(option)}
                  className={`flex-1 flex-row items-center justify-center gap-2 h-11 rounded-card border ${
                    gender === option
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <View
                    className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                      gender === option ? "border-white" : "border-text-muted"
                    }`}
                  >
                    {gender === option && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                  <Text
                    className={`text-button font-medium ${
                      gender === option ? "text-white" : "text-text-secondary"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Headline */}
          <View onLayout={registerField("headline")}>
            <Card className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-label text-ink-muted">Headline</Text>
                <Text className="text-caption text-text-muted">
                  {headline.length}/{HEADLINE_MAX}
                </Text>
              </View>
            <FieldShell
              value={headline}
              error={!!errors.headline}
              valid={headline.trim().length > 0}
              className="min-h-btn bg-surface rounded-card"
            >
              {({ onFocus, onBlur }) => (
                <TextInput
                  value={headline}
                  onChangeText={(value) => setHeadline(value.slice(0, HEADLINE_MAX))}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="e.g., Experienced Math & Physics tutor"
                  placeholderTextColor={colors.text.muted}
                  className={inputBase}
                />
              )}
            </FieldShell>
            {errors.headline ? (
              <Text className="text-caption text-danger">{errors.headline}</Text>
            ) : null}
            </Card>
          </View>

          {/* Bio */}
          <Card className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-label text-ink-muted">
                About you (optional)
              </Text>
              <Text className="text-caption text-text-muted">
                {bio.length}/{BIO_MAX}
              </Text>
            </View>
            <FieldShell
              value={bio}
              error={false}
              valid={false}
              className="min-h-bio-area bg-surface rounded-card"
            >
              {({ onFocus, onBlur }) => (
                <TextInput
                  value={bio}
                  onChangeText={(value) => setBio(value.slice(0, BIO_MAX))}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Tell parents about your teaching style, experience, and approach."
                  placeholderTextColor={colors.text.muted}
                  multiline
                  numberOfLines={4}
                  className="min-h-bio-area px-4 py-3 border-0 rounded-card bg-surface text-text-primary text-body-lg"
                  style={{ textAlignVertical: "top" }}
                />
              )}
            </FieldShell>
          </Card>

          {/* Credentials — degree + institution */}
          <View onLayout={registerField("credentials")}>
            <Card className="gap-4">
              <Text className="text-label text-ink-muted">
                Your credentials
              </Text>
            <Text className="text-caption text-text-secondary -mt-3">
              This is shown on your profile so parents know your background.
            </Text>

            {/* Degree — SearchableSelect with curated qualifications */}
            <SearchableSelect
              value={degree}
              onChange={setDegree}
              options={QUALIFICATION_LABELS}
              label="Degree / Qualification"
              description="Start typing to search common qualifications, or enter your own."
              placeholder="e.g., B.Sc. in Mathematics"
              icon="school-outline"
              error={errors.degree}
              valid={degree.length > 0 && validateDegree(degree) === null}
            />

            <View className="h-2" />

            {/* Institution — SearchableSelect with curated institutions */}
            <SearchableSelect
              value={institution}
              onChange={setInstitution}
              options={INSTITUTION_LABELS}
              label="Institution / University"
              description="Start typing your college or university name."
              placeholder="e.g., Tribhuvan University"
              icon="business-outline"
              error={errors.institution}
              valid={institution.length > 0 && validateInstitution(institution) === null}
            />
            </Card>
          </View>

          <View onLayout={registerField("subjects")}>
            <ChipGroup
              label="Subjects you teach"
              options={SUBJECTS}
              selected={subjects}
              onToggle={toggleSubject}
              error={errors.subjects}
            />
          </View>

          <View onLayout={registerField("grades")}>
            <ChipGroup
              label="Grade levels you teach"
              options={GRADES}
              selected={gradesTeaching}
              onToggle={toggleGrade}
              error={errors.grades}
            />
          </View>

          {/* Stepper + rate */}
          <View onLayout={registerField("rate")}>
            <Card className="gap-4">
            <View className="gap-1">
              <Text className="text-label text-ink-muted">
                Years of experience
              </Text>
              <View className="flex-row items-center gap-3">
                <StepperButton
                  icon="remove"
                  accessibilityLabel="Decrease years of experience"
                  onPress={() => adjustExperience(-1)}
                  disabled={yearsExperience === 0}
                />
                <View className="flex-1 items-center">
                  <Text className="text-stepper-value text-text-primary">
                    {yearsExperience}
                  </Text>
                  <Text className="text-caption text-text-muted">
                    {yearsExperience === 1 ? "year" : "years"}
                  </Text>
                </View>
                <StepperButton
                  icon="add"
                  accessibilityLabel="Increase years of experience"
                  onPress={() => adjustExperience(1)}
                  disabled={yearsExperience === 50}
                />
              </View>
            </View>

            <View className="gap-1">
              <Text className="text-label text-ink-muted">
                Monthly rate (NPR)
              </Text>
              <FieldShell
                value={monthlyRateNpr}
                error={!!errors.monthlyRate}
                valid={isValidRate}
                className="h-rate-row bg-surface rounded-card"
              >
                {({ onFocus, onBlur }) => (
                  <View className="flex-row items-center h-rate-row px-3 gap-1 pr-10">
                    <Text className="text-body text-text-muted font-semibold">Rs.</Text>
                    <TextInput
                      value={monthlyRateNpr}
                      onChangeText={setMonthlyRateNpr}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder="10000"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="numeric"
                      className="flex-1 text-text-primary text-body-lg font-semibold"
                    />
                    <Text className="text-caption text-text-muted">/ month</Text>
                  </View>
                )}
              </FieldShell>
              {errors.monthlyRate ? (
                <Text className="text-caption text-danger">{errors.monthlyRate}</Text>
              ) : null}
            </View>
            </Card>
          </View>

          <View onLayout={registerField("location")}>
            <LocationField value={location} onChange={setLocation} />
            {errors.location ? (
              <Text className="text-caption text-danger mt-1">
                {errors.location}
              </Text>
            ) : null}
          </View>

          {/* Verification documents — two required (citizenship +
              academic certificate) and one optional (demo video).
              Each `DocumentUploader` writes directly to Supabase
              Storage via `lib/verification/documents.ts`; the
              returned `TutorDocument` lands in the local `documents`
              Map and is persisted to Firestore on submit. */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-label text-ink-muted">
                Verification documents
              </Text>
              <Text className="text-caption text-text-muted">
                {documents.size} of 3
              </Text>
            </View>
            <DocumentUploader
              kind="citizenship"
              existing={citizenshipDoc}
              onUploaded={(d) =>
                setDocuments((prev) => {
                  const next = new Map(prev);
                  next.set(d.kind, d);
                  return next;
                })
              }
            />
            <DocumentUploader
              kind="certificate"
              existing={certificateDoc}
              onUploaded={(d) =>
                setDocuments((prev) => {
                  const next = new Map(prev);
                  next.set(d.kind, d);
                  return next;
                })
              }
            />
            <DocumentUploader
              kind="demo"
              existing={demoDoc}
              onUploaded={(d) =>
                setDocuments((prev) => {
                  const next = new Map(prev);
                  next.set(d.kind, d);
                  return next;
                })
              }
            />
            <Text className="text-caption text-text-muted">
              Your documents are private. Only the EdumentX verification
              team can view them.
            </Text>
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

function StepperButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled,
}: {
  icon: "remove" | "add";
  accessibilityLabel: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={animatedStyle}
      className="w-11 h-11 rounded-full bg-surface-muted border border-border items-center justify-center disabled:opacity-40"
    >
      <Ionicons color={colors.text.primary} name={icon} size={20} />
    </AnimatedPressable>
  );
}
