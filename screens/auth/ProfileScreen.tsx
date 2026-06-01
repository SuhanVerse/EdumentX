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

import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { theme } from "../../constants/theme";
import { typography } from "../../constants/typography";

const Subjects = ["Math", "Physics"] as const;
type Subject = (typeof Subjects)[number];

const Grades = ["9", "10", "11", "12"] as const;
type Grade = (typeof Grades)[number];

interface FormErrors {
  fullName?: string;
  email?: string;
  grade?: string;
  subjects?: string;
}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(
  fullName: string,
  email: string,
  grade: Grade | null,
  subjects: Subject[],
): FormErrors {
  const errors: FormErrors = {};

  if (fullName.trim().length === 0) {
    errors.fullName = "Enter your full name";
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!grade) {
    errors.grade = "Select your grade";
  }

  if (subjects.length === 0) {
    errors.subjects = "Select atleast one subject";
  }

  return errors;
}

export function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState<Subject | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status! == "granted") {
      Alert.alert("Permission Denied", "Allow access to photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setProfile(result.assets[0].uri);
  }

  const canSubmit =
    name.trim().length >= 3 &&
    EMAIL_REGEX.test(email.trim()) &&
    grade !== null &&
    subject !== null;

  function handleSubmit() {
    const validationErrors = validate(
      name,
      email,
      grade,
      subject ? [subject] : [],
    );

    if (Object.keys(validationErrors).length > 0) {
      Alert.alert("Validation Error");
      return;
    }
  }
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.blueHeader}>
          <Text style={styles.headerTitle}>Setup Your Profile</Text>
          <Text style={styles.headerSubtitle}>
            This helps tutor find and match with you
          </Text>
        </View>

        <ScrollView style={styles.scrollContent}>
          <View>
            <Pressable>
              {profile ? (
                <Image style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person"
                    size={44}
                    color={colors.brand.primary}
                  />
                </View>
              )}
            </Pressable>
          </View>
          <View>
            <text> FULL NAME</text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g., Arav Tamang"
            />
          </View>
          <View>
            <text> EMAIL</text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g., aarav@gmail.com"
              keyboardType="email-address"
            />
          </View>
          <View>
            <View>
              <Text style={styles.cardLabel}>GRADE / CLASS</Text>
              <View style={styles.chipWrap}>
                {Grades.map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGrade(g)}
                    style={[styles.chip, grade === g && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        grade === g && styles.chipTextSelected,
                      ]}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <View>
            <View style={styles.sectionCard}>
              <Text style={styles.cardLabel}>SUBJECTS NEEDED</Text>
              <View style={styles.chipWrap}>
                {Subjects.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSubject(s)}
                    style={[styles.chip, subject === s && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        subject === s && styles.chipTextSelected,
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.brand.primary,
  },
  flex: {
    flex: 1,
  },

  blueHeader: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.md,
    paddingBottom: 52,
    gap: 4,
  },

  headerTitle: {
    ...typography.screenTitle,
    color: colors.text.inverse,
  },

  headerSubtitle: {
    ...typography.body,
    color: colors.text.inverse,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background.page,
  },

  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.circle,
    borderWidth: 2,
    borderColor: colors.brand.primary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.circle,
    backgroundColor: colors.brand.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.brand.primary,
  },
  sectionCard: {
    backgroundColor: colors.background.surface,
    borderRadius: theme.radii.card,
    padding: spacing.md,
    marginBottom: spacing.page,
    gap: spacing.sm,
    borderColor: colors.border.default,
    borderWidth: 1,
  },
  cardLabel: {
    ...typography.overline,
    color: colors.text.secondary,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderRadius: theme.radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
    backgroundColor: colors.background.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: theme.sizes.touchTarget,
    justifyContent: "center",
  },
  chipSelected: {
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primaryLight,
  },
  chipText: { ...typography.button, color: colors.text.secondary },
  chipTextSelected: { color: colors.brand.primary },
});
