import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Text, XStack, YStack } from "tamagui";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

const SUBJECTS = ["Math", "Physics", "Chemistry", "Computer Science", "Biology", "Nepali", "English"] as const;
const GRADES = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade XI (Science)", "Grade XI (Management)", "Grade XII (Science)", "Grade XII (Management)"] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Subject = (typeof SUBJECTS)[number];
type Grade = (typeof GRADES)[number];

interface FormErrors {
  email?: string;
  fullName?: string;
  grade?: string;
  subject?: string;
}

function validateProfile(
  fullName: string,
  email: string,
  grade: Grade | null,
  subject: Subject | null,
): FormErrors {
  const errors: FormErrors = {};

  if (fullName.trim().length < 3) {
    errors.fullName = "Enter your full name.";
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!grade) {
    errors.grade = "Select your grade.";
  }

  if (!subject) {
    errors.subject = "Select one subject.";
  }

  return errors;
}

export function ProfileScreen() {
  const router = useRouter();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const canSubmit =
    fullName.trim().length >= 3 &&
    EMAIL_REGEX.test(email.trim()) &&
    grade !== null &&
    subject !== null;

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access to choose a profile image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  function handleSubmit() {
    const validationErrors = validateProfile(fullName, email, grade, subject);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

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
            backgroundColor="transparent"
            pressStyle={{ backgroundColor: "transparent" }}
          >
            <Ionicons
              color={colors.text.inverse}
              name="chevron-back"
              size={18}
            />
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
          <YStack alignItems="center" gap={spacing.sm} marginBottom={spacing.md}>
            <Button
              accessibilityRole="button"
              onPress={handlePickAvatar}
              width={96}
              height={96}
              padding={0}
              borderRadius={9999}
              borderWidth={4}
              borderColor={colors.background.surface}
              backgroundColor={colors.border.default}
              pressStyle={{ backgroundColor: colors.border.default, opacity: 0.85 }}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: 88, height: 88, borderRadius: 9999 }}
                />
              ) : (
                <Ionicons
                  color={colors.brand.primary}
                  name="person-outline"
                  size={40}
                />
              )}
            </Button>
            <Text {...typography.caption} color={colors.text.secondary} fontWeight="500">
              Upload photo
            </Text>
          </YStack>

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
              Full name
            </Text>
            <Input
              autoCapitalize="words"
              onChangeText={setFullName}
              placeholder="e.g., Aarav Tamang"
              placeholderTextColor="$textMuted"
              minHeight={52}
              paddingHorizontal={spacing.lg}
              borderWidth={1.5}
              borderColor={errors.fullName ? colors.semantic.danger : colors.border.default}
              borderRadius={12}
              backgroundColor={colors.background.surface}
              color={colors.text.primary}
              fontSize={15}
              value={fullName}
            />
            {errors.fullName ? (
              <Text {...typography.caption} color={colors.semantic.danger} marginTop={-4}>
                {errors.fullName}
              </Text>
            ) : null}

            <Text {...typography.overline} color={colors.text.muted} marginBottom={-4}>
              Email
            </Text>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="e.g., aarav@gmail.com"
              placeholderTextColor="$textMuted"
              minHeight={52}
              paddingHorizontal={spacing.lg}
              borderWidth={1.5}
              borderColor={errors.email ? colors.semantic.danger : colors.border.default}
              borderRadius={12}
              backgroundColor={colors.background.surface}
              color={colors.text.primary}
              fontSize={15}
              value={email}
            />
            {errors.email ? (
              <Text {...typography.caption} color={colors.semantic.danger} marginTop={-4}>
                {errors.email}
              </Text>
            ) : null}
          </YStack>

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
            <Text {...typography.overline} color={colors.text.muted} marginBottom={-4}>
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
                    onPress={() => setGrade(item)}
                    minHeight={40}
                    paddingHorizontal={spacing.lg}
                    paddingVertical={spacing.sm}
                    borderWidth={1.5}
                    borderColor={active ? colors.brand.primary : colors.border.default}
                    borderRadius={10}
                    backgroundColor={active ? colors.brand.primary : colors.background.surface}
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
              <Text {...typography.caption} color={colors.semantic.danger} marginTop={-4}>
                {errors.grade}
              </Text>
            ) : null}
          </YStack>

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
            <Text {...typography.overline} color={colors.text.muted} marginBottom={-4}>
              Subject needed
            </Text>
            <XStack flexWrap="wrap" gap={spacing.sm}>
              {SUBJECTS.map((item) => {
                const active = subject === item;
                return (
                  <Button
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSubject(item)}
                    minHeight={40}
                    paddingHorizontal={spacing.lg}
                    paddingVertical={spacing.sm}
                    borderWidth={1.5}
                    borderColor={active ? colors.brand.primary : colors.border.default}
                    borderRadius={10}
                    backgroundColor={active ? colors.brand.primary : colors.background.surface}
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
            {errors.subject ? (
              <Text {...typography.caption} color={colors.semantic.danger} marginTop={-4}>
                {errors.subject}
              </Text>
            ) : null}
          </YStack>

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
            <Text
              {...typography.button}
              color={canSubmit ? "$textInverse" : "$textMuted"}
              fontSize={16}
              fontWeight="600"
            >
              Finish setup
            </Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
