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
  // const [role, setRole] = useState("");

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
          style={styles.scrollView}
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
    backgroundColor: colors.brand.primary, // Night Slate
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: 48,
    backgroundColor: colors.brand.primary,
  },
  backButton: {
    minHeight: theme.sizes.touchTarget,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: -4,
  },
  backText: {
    ...typography.body,
    color: colors.text.inverse,
    opacity: 0.8,
  },
  headerTitle: {
    ...typography.heroTitle,
    color: colors.text.inverse,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.text.inverse,
    opacity: 0.7,
    marginTop: 2,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingHorizontal: spacing.page,
    paddingTop: 32, // Increased padding to avoid collision with header
    paddingBottom: 40,
    backgroundColor: colors.background.page, // Sand
  },
  avatarButton: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 0, // Removed negative margin to stop overlap
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderWidth: 4,
    borderColor: colors.background.surface,
    borderRadius: theme.radii.circle,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.background.surface,
    borderRadius: theme.radii.circle,
    backgroundColor: colors.border.default,
  },
  avatarText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  sectionCard: {
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 16,
    backgroundColor: colors.background.surface,
    // Soft Depth Shadow
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardLabel: {
    ...typography.overline,
    color: colors.text.muted,
    marginBottom: -4,
  },
  textInput: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 12,
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
    marginTop: -4,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 10,
    backgroundColor: colors.background.surface,
  },
  chipSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary,
  },
  chipText: {
    ...typography.buttonSmall,
    color: colors.text.secondary,
  },
  chipTextSelected: {
    color: colors.text.inverse,
  },
  primaryButton: {
    minHeight: 56,
    marginTop: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.brand.accent, // Copper Accent
    // Soft Copper Glow
    shadowColor: colors.brand.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border.strong,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonTextDisabled: {
    color: colors.text.muted,
  },
});
