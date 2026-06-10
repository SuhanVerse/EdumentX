import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";

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
  if (fullName.trim().length < 3) errors.fullName = "Enter your full name.";
  if (!EMAIL_REGEX.test(email.trim())) errors.email = "Enter a valid email address.";
  if (!grade) errors.grade = "Select your grade.";
  if (!subject) errors.subject = "Select one subject.";
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

  function handleSubmit() {
    const validationErrors = validateProfile(fullName, email, grade, subject);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    Alert.alert(
      "Profile ready",
      "Firebase profile saving will be connected in the auth sprint.",
    );
  }

  const inputBase =
    "min-h-btn px-4 border-emphasis rounded-card bg-surface text-text-primary text-body-lg";

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
            Set up your profile
          </Text>
          <Text className="text-body text-white opacity-70 mt-0.5">
            This helps tutors understand your learning needs.
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow gap-6 px-5 pt-8 pb-10 bg-background"
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar uploader */}
          <View className="items-center gap-2 mb-4">
            <Pressable
              accessibilityRole="button"
              className="w-24 h-24 rounded-full border-4 border-surface bg-border items-center justify-center active:opacity-85"
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="w-avatar-uploader h-avatar-uploader rounded-full"
                />
              ) : (
                <Ionicons color={colors.brand.primary} name="person-outline" size={40} />
              )}
            </Pressable>
            <Text className="text-caption text-text-secondary font-medium">
              Upload photo
            </Text>
          </View>

          {/* Name + email card */}
          <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <View className="gap-1">
              <Text className="text-overline text-text-muted uppercase">
                Full name
              </Text>
              <TextInput
                autoCapitalize="words"
                onChangeText={setFullName}
                placeholder="e.g., Aarav Tamang"
                placeholderTextColor={colors.text.muted}
                className={`${inputBase} ${
                  errors.fullName ? "border-danger" : "border-border"
                }`}
                value={fullName}
              />
              {errors.fullName ? (
                <Text className="text-caption text-danger -mt-1">
                  {errors.fullName}
                </Text>
              ) : null}
            </View>

            <View className="gap-1">
              <Text className="text-overline text-text-muted uppercase">Email</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="e.g., aarav@gmail.com"
                placeholderTextColor={colors.text.muted}
                className={`${inputBase} ${
                  errors.email ? "border-danger" : "border-border"
                }`}
                value={email}
              />
              {errors.email ? (
                <Text className="text-caption text-danger -mt-1">
                  {errors.email}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Grade */}
          <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <Text className="text-overline text-text-muted uppercase">
              Grade / class
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {GRADES.map((item) => {
                const active = grade === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setGrade(item)}
                    className={`min-h-btn-sm px-4 py-2 rounded-md border-emphasis active:opacity-85 ${
                      active
                        ? "bg-night border-night"
                        : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={`text-button-sm ${
                        active ? "text-white" : "text-text-secondary"
                      }`}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.grade ? (
              <Text className="text-caption text-danger -mt-1">{errors.grade}</Text>
            ) : null}
          </View>

          {/* Subject */}
          <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
            <Text className="text-overline text-text-muted uppercase">
              Subject needed
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SUBJECTS.map((item) => {
                const active = subject === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSubject(item)}
                    className={`min-h-btn-sm px-4 py-2 rounded-md border-emphasis active:opacity-85 ${
                      active
                        ? "bg-night border-night"
                        : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={`text-button-sm ${
                        active ? "text-white" : "text-text-secondary"
                      }`}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.subject ? (
              <Text className="text-caption text-danger -mt-1">{errors.subject}</Text>
            ) : null}
          </View>

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
