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
import { Button, Text, XStack, YStack } from "tamagui";

import { AvatarUploader } from "@/components/forms/AvatarUploader";
import { ChipGroup } from "@/components/forms/ChipGroup";
import { LocationField } from "@/components/forms/LocationField";
import { NameEmailFields } from "@/components/forms/NameEmailFields";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { registration } from "@/lib/registration";

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormErrors = {
  fullName?: string;
  email?: string;
  grade?: string;
  subjects?: string;
};

export function StudentProfileScreen() {
  const router = useRouter();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [location, setLocation] = useState<{ neighborhood: string; city: string } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  function toggleSubject(option: string) {
    setSubjects((prev) =>
      prev.includes(option) ? prev.filter((s) => s !== option) : [...prev, option],
    );
  }

  const canSubmit =
    fullName.trim().length >= 3 &&
    EMAIL_REGEX.test(email.trim()) &&
    grade !== null &&
    subjects.length >= 1 &&
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
    if (!grade) {
      validationErrors.grade = "Select your grade.";
    }
    if (subjects.length < 1) {
      validationErrors.subjects = "Select at least one subject.";
    }
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    registration.updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      grade,
      subjects,
      location,
    });

    Alert.alert(
      "Profile ready",
      "Firebase profile saving will be connected in the auth sprint.",
    );
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
            Set up your profile
          </Text>
          <Text {...typography.body} color={colors.text.inverse} opacity={0.7} marginTop={2}>
            This helps tutors understand your learning needs.
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

          {/* Single-select grade (student only) */}
          <YStack
            gap={spacing.md}
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
              Grade / class
            </Text>
            <XStack flexWrap="wrap" gap={spacing.sm}>
              {GRADES.map((item) => {
                const active = grade === item;
                return (
                  <Button
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    minHeight={40}
                    paddingHorizontal={spacing.lg}
                    paddingVertical={spacing.sm}
                    borderWidth={1.5}
                    borderColor={active ? colors.brand.primary : colors.border.default}
                    borderRadius={10}
                    backgroundColor={active ? colors.brand.primary : colors.background.surface}
                    onPress={() => setGrade(item)}
                    pressStyle={{
                      backgroundColor: active ? colors.brand.primary : colors.background.surface,
                      opacity: 0.85,
                    }}
                  >
                    <Text
                      {...typography.buttonSmall}
                      color={active ? colors.text.inverse : colors.text.secondary}
                    >
                      {item}
                    </Text>
                  </Button>
                );
              })}
            </XStack>
            {errors.grade ? (
              <Text {...typography.caption} color={colors.semantic.danger}>
                {errors.grade}
              </Text>
            ) : null}
          </YStack>

          <ChipGroup
            label="Subjects needed"
            options={SUBJECTS}
            selected={subjects}
            onToggle={toggleSubject}
            error={errors.subjects}
          />

          <LocationField value={location} onChange={setLocation} />

          <Button
            accessibilityRole="button"
            disabled={!canSubmit}
            minHeight={56}
            marginTop={spacing.lg}
            borderRadius={14}
            backgroundColor={canSubmit ? "$brandAccent" : "$borderStrong"}
            onPress={handleSubmit}
            pressStyle={{
              backgroundColor: canSubmit ? "$brandAccent" : "$borderStrong",
              opacity: 0.9,
            }}
            shadowColor={canSubmit ? "$brandAccent" : "transparent"}
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={canSubmit ? 0.2 : 0}
            shadowRadius={8}
          >
            <Text {...typography.button} color={canSubmit ? "$textInverse" : "$textMuted"} fontSize={16} fontWeight="600">
              Finish setup
            </Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
