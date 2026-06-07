import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Text, XStack, YStack } from "tamagui";

import { AvatarUploader } from "@/components/forms/AvatarUploader";
import { ChipGroup } from "@/components/forms/ChipGroup";
import { LocationField } from "@/components/forms/LocationField";
import { NameEmailFields } from "@/components/forms/NameEmailFields";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
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
  hourlyRate?: string;
  location?: string;
};

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
  const [hourlyRateNpr, setHourlyRateNpr] = useState("");
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

  const hourlyRateNumber = Number(hourlyRateNpr);
  const isValidRate = hourlyRateNpr.trim().length > 0 && !Number.isNaN(hourlyRateNumber) && hourlyRateNumber >= 0;

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
    if (fullName.trim().length < 3) {
      validationErrors.fullName = "Enter your full name.";
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      validationErrors.email = "Enter a valid email address.";
    }
    if (headline.trim().length === 0) {
      validationErrors.headline = "Add a one-line headline that parents will see.";
    }
    if (subjects.length < 1) {
      validationErrors.subjects = "Select at least one subject you teach.";
    }
    if (gradesTeaching.length < 1) {
      validationErrors.grades = "Select at least one grade level you teach.";
    }
    if (!isValidRate) {
      validationErrors.hourlyRate = "Enter your hourly rate in NPR.";
    }
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

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
      hourlyRateNpr: hourlyRateNumber,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.brand.primary }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Dark header */}
        <YStack
          gap={spacing.xs}
          paddingHorizontal={spacing.xl}
          paddingTop={spacing.lg}
          paddingBottom={48}
          backgroundColor={colors.brand.primary}
        >
          <XStack
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.replace("/role-selection")}
            minHeight={44}
            alignSelf="flex-start"
            alignItems="center"
            gap={spacing.xs}
            marginLeft={-4}
          >
            <Ionicons color={colors.text.inverse} name="chevron-back" size={18} />
            <Text {...typography.body} color={colors.text.inverse} opacity={0.8}>
              Back
            </Text>
          </XStack>
          <Text
            {...typography.heroTitle}
            color={colors.text.inverse}
            fontSize={26}
          >
            Set up your tutor profile
          </Text>
          <Text {...typography.body} color={colors.text.inverse} opacity={0.7} marginTop={2}>
            This is what parents will see on the map. You can update everything later.
          </Text>
        </YStack>

        {/* Sand body */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            gap: spacing.xl,
            paddingHorizontal: spacing.xl,
            paddingTop: 32,
            paddingBottom: 40,
            backgroundColor: colors.background.page,
          }}
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
          <YStack
            gap={spacing.xs}
            padding={spacing.xl}
            borderWidth={1}
            borderColor={colors.border.subtle}
            borderRadius={16}
            backgroundColor={colors.background.surface}
            shadowColor={colors.brand.primary}
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.05}
            shadowRadius={12}
          >
            <Text {...typography.overline} color={colors.text.muted}>
              Phone (verified)
            </Text>
            <XStack
              alignItems="center"
              gap={spacing.sm}
              minHeight={52}
              paddingHorizontal={spacing.md}
              borderWidth={1.5}
              borderColor={colors.border.default}
              borderRadius={10}
              backgroundColor={colors.background.page}
            >
              <Ionicons color={colors.text.muted} name="lock-closed-outline" size={18} />
              <Text {...typography.body} color={colors.text.primary} fontWeight="600">
                {phone ? `+977 ${phone}` : "+977 98XXXXXXXX"}
              </Text>
            </XStack>
            <Text {...typography.caption} color={colors.text.muted}>
              Verified during signup. Parents can request to call you from inside the app.
            </Text>
          </YStack>

          {/* Headline */}
          <YStack
            gap={spacing.xs}
            padding={spacing.xl}
            borderWidth={1}
            borderColor={colors.border.subtle}
            borderRadius={16}
            backgroundColor={colors.background.surface}
            shadowColor={colors.brand.primary}
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.05}
            shadowRadius={12}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <Text {...typography.overline} color={colors.text.muted}>
                Headline
              </Text>
              <Text {...typography.caption} color={colors.text.muted}>
                {headline.length}/{HEADLINE_MAX}
              </Text>
            </XStack>
            <Input
              value={headline}
              onChangeText={(value) => setHeadline(value.slice(0, HEADLINE_MAX))}
              placeholder="e.g., Experienced Math & Physics tutor | SEE graduate"
              placeholderTextColor="$textMuted"
              minHeight={52}
              paddingHorizontal={spacing.lg}
              borderWidth={1.5}
              borderColor={errors.headline ? colors.semantic.danger : colors.border.default}
              borderRadius={12}
              backgroundColor={colors.background.surface}
              color={colors.text.primary}
              fontSize={15}
            />
            {errors.headline ? (
              <Text {...typography.caption} color={colors.semantic.danger}>
                {errors.headline}
              </Text>
            ) : null}
          </YStack>

          {/* Bio (optional) */}
          <YStack
            gap={spacing.xs}
            padding={spacing.xl}
            borderWidth={1}
            borderColor={colors.border.subtle}
            borderRadius={16}
            backgroundColor={colors.background.surface}
            shadowColor={colors.brand.primary}
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.05}
            shadowRadius={12}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <Text {...typography.overline} color={colors.text.muted}>
                About you (optional)
              </Text>
              <Text {...typography.caption} color={colors.text.muted}>
                {bio.length}/{BIO_MAX}
              </Text>
            </XStack>
            <Input
              value={bio}
              onChangeText={(value) => setBio(value.slice(0, BIO_MAX))}
              placeholder="Tell parents about your teaching style, experience, and approach."
              placeholderTextColor="$textMuted"
              multiline
              numberOfLines={4}
              minHeight={120}
              paddingHorizontal={spacing.lg}
              paddingVertical={spacing.md}
              borderWidth={1.5}
              borderColor={colors.border.default}
              borderRadius={12}
              backgroundColor={colors.background.surface}
              color={colors.text.primary}
              fontSize={15}
              textAlignVertical="top"
            />
          </YStack>

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

          {/* Years of experience stepper + Hourly rate */}
          <YStack
            gap={spacing.lg}
            padding={spacing.xl}
            borderWidth={1}
            borderColor={colors.border.subtle}
            borderRadius={16}
            backgroundColor={colors.background.surface}
            shadowColor={colors.brand.primary}
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.05}
            shadowRadius={12}
          >
            <YStack gap={spacing.xs}>
              <Text {...typography.overline} color={colors.text.muted}>
                Years of experience
              </Text>
              <XStack alignItems="center" gap={spacing.md}>
                <Button
                  accessibilityRole="button"
                  accessibilityLabel="Decrease years of experience"
                  width={44}
                  height={44}
                  borderRadius={9999}
                  backgroundColor={colors.background.page}
                  borderWidth={1.5}
                  borderColor={colors.border.default}
                  onPress={() => adjustExperience(-1)}
                  pressStyle={{ backgroundColor: colors.background.page, opacity: 0.7 }}
                  disabled={yearsExperience === 0}
                >
                  <Ionicons color={colors.text.primary} name="remove" size={20} />
                </Button>
                <YStack flex={1} alignItems="center">
                  <Text {...typography.heroTitle} color={colors.text.primary} fontSize={22}>
                    {yearsExperience}
                  </Text>
                  <Text {...typography.caption} color={colors.text.muted}>
                    {yearsExperience === 1 ? "year" : "years"}
                  </Text>
                </YStack>
                <Button
                  accessibilityRole="button"
                  accessibilityLabel="Increase years of experience"
                  width={44}
                  height={44}
                  borderRadius={9999}
                  backgroundColor={colors.background.page}
                  borderWidth={1.5}
                  borderColor={colors.border.default}
                  onPress={() => adjustExperience(1)}
                  pressStyle={{ backgroundColor: colors.background.page, opacity: 0.7 }}
                  disabled={yearsExperience === 50}
                >
                  <Ionicons color={colors.text.primary} name="add" size={20} />
                </Button>
              </XStack>
            </YStack>

            <YStack gap={spacing.xs}>
              <Text {...typography.overline} color={colors.text.muted}>
                Hourly rate (NPR)
              </Text>
              <XStack
                alignItems="center"
                minHeight={52}
                paddingHorizontal={spacing.md}
                borderWidth={1.5}
                borderColor={errors.hourlyRate ? colors.semantic.danger : colors.border.default}
                borderRadius={12}
                backgroundColor={colors.background.surface}
                gap={spacing.xs}
              >
                <Text {...typography.body} color={colors.text.muted} fontWeight="600">
                  Rs.
                </Text>
                <Input
                  value={hourlyRateNpr}
                  onChangeText={setHourlyRateNpr}
                  placeholder="800"
                  placeholderTextColor="$textMuted"
                  keyboardType="numeric"
                  flex={1}
                  borderWidth={0}
                  backgroundColor="transparent"
                  color={colors.text.primary}
                  fontSize={15}
                  fontWeight="600"
                />
                <Text {...typography.caption} color={colors.text.muted}>
                  / hr
                </Text>
              </XStack>
              {errors.hourlyRate ? (
                <Text {...typography.caption} color={colors.semantic.danger}>
                  {errors.hourlyRate}
                </Text>
              ) : null}
            </YStack>
          </YStack>

          <LocationField value={location} onChange={setLocation} />

          <Button
            accessibilityRole="button"
            disabled={!canSubmit}
            minHeight={56}
            marginTop={spacing.lg}
            borderRadius={14}
            backgroundColor={canSubmit ? colors.brand.accent : colors.border.strong}
            onPress={handleSubmit}
            pressStyle={{
              backgroundColor: canSubmit ? colors.brand.accent : colors.border.strong,
              opacity: 0.9,
            }}
            shadowColor={canSubmit ? colors.brand.accent : "transparent"}
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={canSubmit ? 0.2 : 0}
            shadowRadius={8}
          >
            <Text {...typography.button} color={canSubmit ? colors.text.inverse : colors.text.muted} fontSize={16} fontWeight="600">
              Finish setup
            </Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
