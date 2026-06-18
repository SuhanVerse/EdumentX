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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AvatarUploader } from "@/components/forms/AvatarUploader";
import { ChipGroup } from "@/components/forms/ChipGroup";
import { LocationField } from "@/components/forms/LocationField";
import { NameEmailFields } from "@/components/forms/NameEmailFields";
import { colors } from "@/constants/colors";
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
    if (fullName.trim().length < 3) validationErrors.fullName = "Enter your full name.";
    if (!EMAIL_REGEX.test(email.trim())) validationErrors.email = "Enter a valid email address.";
    if (!grade) validationErrors.grade = "Select your grade.";
    if (subjects.length < 1) validationErrors.subjects = "Select at least one subject.";
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    registration.updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      grade,
      subjects,
      location,
    });
    
    // Alert.alert(
    //   "Profile ready",
    //   "Firebase profile saving will be connected in the auth sprint.",
    // );
    router.push("/student-home")
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
          <AvatarUploader value={avatarUri} onChange={setAvatarUri} />

          <NameEmailFields
            fullName={fullName}
            email={email}
            errors={errors}
            onChangeFullName={setFullName}
            onChangeEmail={setEmail}
          />

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
                      active ? "bg-night border-night" : "bg-surface border-border"
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

          <ChipGroup
            label="Subjects needed"
            options={SUBJECTS}
            selected={subjects}
            onToggle={toggleSubject}
            error={errors.subjects}
          />

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
