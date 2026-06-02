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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";

const SUBJECTS = ["Math", "Physics","Chemistry", "Computer Science","Biology","Nepali","English"] as const;
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
      quality: 0.5,
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.replace("/role-selection")}
            style={styles.backButton}
          >
            <Ionicons
              color={colors.text.inverse}
              name="chevron-back"
              size={18}
            />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Set up your profile</Text>
          <Text style={styles.headerSubtitle}>
            This helps tutors understand your learning needs.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            onPress={handlePickAvatar}
            style={styles.avatarButton}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  color={colors.brand.primary}
                  name="person-outline"
                  size={40}
                />
              </View>
            )}
            <Text style={styles.avatarText}>Upload photo</Text>
          </Pressable>

          <View style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Full name</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setFullName}
              placeholder="e.g., Aarav Tamang"
              placeholderTextColor={colors.text.muted}
              style={[
                styles.textInput,
                errors.fullName ? styles.textInputError : null,
              ]}
              value={fullName}
            />
            {errors.fullName ? (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            ) : null}

            <Text style={styles.cardLabel}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="e.g., aarav@gmail.com"
              placeholderTextColor={colors.text.muted}
              style={[
                styles.textInput,
                errors.email ? styles.textInputError : null,
              ]}
              value={email}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Grade / class</Text>
            <View style={styles.chipWrap}>
              {GRADES.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  onPress={() => setGrade(item)}
                  style={[
                    styles.chip,
                    grade === item ? styles.chipSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      grade === item ? styles.chipTextSelected : null,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errors.grade ? (
              <Text style={styles.errorText}>{errors.grade}</Text>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.cardLabel}>Subject needed</Text>
            <View style={styles.chipWrap}>
              {SUBJECTS.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  onPress={() => setSubject(item)}
                  style={[
                    styles.chip,
                    subject === item ? styles.chipSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      subject === item ? styles.chipTextSelected : null,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errors.subject ? (
              <Text style={styles.errorText}>{errors.subject}</Text>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={[
              styles.primaryButton,
              canSubmit ? null : styles.primaryButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                canSubmit ? null : styles.primaryButtonTextDisabled,
              ]}
            >
              Finish setup
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.brand.primary,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 52,
    backgroundColor: colors.brand.primary,
  },
  backButton: {
    minHeight: theme.sizes.touchTarget,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  backText: {
    ...typography.body,
    color: colors.text.inverse,
  },
  headerTitle: {
    ...typography.screenTitle,
    color: colors.text.inverse,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.brand.splashText,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background.page,
  },
  avatarButton: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: -52,
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderWidth: 3,
    borderColor: colors.background.surface,
    borderRadius: theme.radii.circle,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.background.surface,
    borderRadius: theme.radii.circle,
    backgroundColor: colors.brand.primaryLight,
  },
  avatarText: {
    ...typography.caption,
    color: colors.brand.primary,
  },
  sectionCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: theme.borders.cardWidth,
    borderColor: colors.border.default,
    borderRadius: theme.radii.card,
    backgroundColor: colors.background.surface,
  },
  cardLabel: {
    ...typography.overline,
    color: colors.text.secondary,
  },
  textInput: {
    minHeight: theme.sizes.inputHeightLarge,
    paddingHorizontal: spacing.md,
    borderWidth: theme.borders.inputWidth,
    borderColor: colors.border.default,
    borderRadius: theme.radii.md,
    color: colors.text.primary,
    backgroundColor: colors.background.surface,
    fontSize: 15,
  },
  textInputError: {
    borderColor: colors.semantic.danger,
  },
  errorText: {
    ...typography.caption,
    color: colors.semantic.danger,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: theme.sizes.touchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: theme.borders.cardWidth,
    borderColor: colors.border.strong,
    borderRadius: theme.radii.sm,
    backgroundColor: colors.background.surface,
  },
  chipSelected: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primaryLight,
  },
  chipText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  chipTextSelected: {
    color: colors.brand.primary,
  },
  primaryButton: {
    minHeight: theme.sizes.primaryButtonHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.card,
    backgroundColor: colors.brand.primary,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border.strong,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  primaryButtonTextDisabled: {
    color: colors.text.muted,
  },
});
