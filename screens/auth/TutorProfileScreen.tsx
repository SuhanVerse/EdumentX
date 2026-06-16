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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AvatarUploader } from "@/components/forms/AvatarUploader";
import { ChipGroup } from "@/components/forms/ChipGroup";
import { LocationField } from "@/components/forms/LocationField";
import { NameEmailFields } from "@/components/forms/NameEmailFields";
import {
  INPUT_BASE,
  INPUT_BORDER_ERROR,
  INPUT_BORDER_OK,
} from "@/components/forms/inputs";
import { colors } from "@/constants/colors";
import { registration, useRegistration } from "@/lib/registration";

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
const HEADLINE_MAX = 80;
const BIO_MAX = 280;

type FormErrors = {
  fullName?: string;
  email?: string;
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
  const phone = useRegistration((s) => s.phone);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [gradesTeaching, setGradesTeaching] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState(0);
  const [monthlyRateNpr, setMonthlyRateNpr] = useState("");
  const [location, setLocation] = useState<{ neighborhood: string; city: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

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
    EMAIL_REGEX.test(email.trim()) &&
    headline.trim().length > 0 &&
    subjects.length >= 1 &&
    gradesTeaching.length >= 1 &&
    isValidRate &&
    location !== null &&
    location.city.trim().length > 0;

  function handleSubmit() {
    const validationErrors: FormErrors = {};
    if (fullName.trim().length < 3) validationErrors.fullName = "Enter your full name.";
    if (!EMAIL_REGEX.test(email.trim())) validationErrors.email = "Enter a valid email address.";
    if (headline.trim().length === 0) validationErrors.headline = "Add a one-line headline that parents will see.";
    if (subjects.length < 1) validationErrors.subjects = "Select at least one subject you teach.";
    if (gradesTeaching.length < 1) validationErrors.grades = "Select at least one grade level you teach.";
    if (!isValidRate) validationErrors.monthlyRate = "Enter your monthly rate in NPR.";
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    registration.updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      subjects,
      location,
      phoneDisplay: phone ? `+977 ${phone}` : "",
      headline: headline.trim(),
      bio: bio.trim(),
      gradesTeaching,
      yearsExperience,
      monthlyRateNpr: monthlyRateNumber,
    });

    Alert.alert(
      "Tutor profile ready",
      "Firebase profile saving will be connected in the auth sprint.",
    );
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
            email={email}
            errors={errors}
            onChangeFullName={setFullName}
            onChangeEmail={setEmail}
          />

          {/* Phone (read-only) */}
          <View className="gap-1 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <Text className="text-overline text-text-muted uppercase">
              Phone (verified)
            </Text>
            <View className="flex-row items-center gap-2 h-phone-row px-3 border-emphasis border-border rounded-md bg-background">
              <Ionicons color={colors.text.muted} name="lock-closed-outline" size={18} />
              <Text className="text-body text-text-primary font-semibold">
                {phone ? `+977 ${phone}` : "+977 98XXXXXXXX"}
              </Text>
            </View>
            <Text className="text-caption text-text-muted">
              Verified during signup. Parents can request to call you from inside the app.
            </Text>
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
                  placeholder="800"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="numeric"
                  className="flex-1 text-text-primary text-body-lg font-semibold"
                />
                <Text className="text-caption text-text-muted">/ hr</Text>
              </View>
              {errors.monthlyRate ? (
                <Text className="text-caption text-danger">{errors.monthlyRate}</Text>
              ) : null}
            </View>
          </View>

          <LocationField value={location} onChange={setLocation} />

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={handleSubmit}
            className="min-h-btn-lg mt-4 rounded-lg items-center justify-center shadow-md bg-amber active:opacity-90 disabled:bg-border-strong disabled:opacity-60"
          >
            <Text className="text-button text-base font-semibold text-white disabled:text-text-muted">
              Finish setup
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
