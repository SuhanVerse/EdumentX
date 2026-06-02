import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";

type Role = "student" | "tutor";

export function RoleSelectionScreen() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  const canContinue = role !== null;

  function handleRolePress(selectedRole: Role) {
    setRole(selectedRole);
  }

  function handleContinue() {
    if (!canContinue) {
      return;
    }

    router.push("/profile");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.replace("/create_password")}
            style={styles.backButton}
          >
            <Ionicons
              color={colors.brand.primary}
              name="chevron-back"
              size={18}
            />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 3 of 4</Text>
            <Text style={styles.title}>How will you use EdumentX?</Text>
            <Text style={styles.subtitle}>
              Select your role once during signup. Admin approval is required to
              change it later.
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            <RoleCard
              active={role === "student"}
              iconColor={colors.brand.primary}
              iconName="school-outline"
              iconStyle={styles.iconBoxBlue}
              onPress={() => handleRolePress("student")}
              selectedStyle={styles.cardSelectedBlue}
              subtitle="Find verified home tutors and manage enrollments."
              title="Student / Parent"
            />

            <RoleCard
              active={role === "tutor"}
              iconColor={colors.brand.verification}
              iconName="book-outline"
              iconStyle={styles.iconBoxGreen}
              onPress={() => handleRolePress("tutor")}
              selectedStyle={styles.cardSelectedGreen}
              subtitle="List your teaching services and receive enrollment requests."
              title="Tutor"
            />
          </View>

          <View style={styles.warningBanner}>
            <Ionicons
              color={colors.semantic.warning}
              name="alert-circle-outline"
              size={18}
            />
            <Text style={styles.warningText}>
              Choose carefully. Role changes should go through admin approval
              later.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={handleContinue}
            style={[
              styles.continueButton,
              canContinue ? null : styles.continueButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.continueButtonText,
                canContinue ? null : styles.continueButtonTextDisabled,
              ]}
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface RoleCardProps {
  active: boolean;
  iconColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconStyle: object;
  onPress: () => void;
  selectedStyle: object;
  subtitle: string;
  title: string;
}

function RoleCard({
  active,
  iconColor,
  iconName,
  iconStyle,
  onPress,
  selectedStyle,
  subtitle,
  title,
}: RoleCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, active ? selectedStyle : null]}
    >
      <View style={[styles.iconBox, iconStyle]}>
        <Ionicons color={iconColor} name={iconName} size={26} />
      </View>

      <View style={styles.cardTextGroup}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>

      {active ? (
        <View style={[styles.checkCircle, { backgroundColor: iconColor }]}>
          <Ionicons color={colors.text.inverse} name="checkmark" size={14} />
        </View>
      ) : (
        <Ionicons
          color={colors.border.strong}
          name="chevron-forward"
          size={20}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.page,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  backButton: {
    minHeight: theme.sizes.touchTarget,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.brand.primary,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  stepLabel: {
    ...typography.overline,
    color: colors.brand.primary,
  },
  title: {
    ...typography.heroTitle,
    color: colors.text.onboardingTitle,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  cardsContainer: {
    gap: spacing.md,
  },
  card: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: theme.borders.cardWidth,
    borderColor: colors.border.default,
    borderRadius: theme.radii.lg,
    backgroundColor: colors.background.surface,
  },
  cardSelectedBlue: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  cardSelectedGreen: {
    borderWidth: 1,
    borderColor: colors.brand.verification,
  },
  iconBox: {
    width: 52,
    height: 52,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.card,
  },
  iconBoxBlue: {
    backgroundColor: colors.onboarding.mapBackground,
  },
  iconBoxGreen: {
    backgroundColor: colors.onboarding.verifyBackground,
  },
  cardTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.text.onboardingTitle,
  },
  cardSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  checkCircle: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.circle,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.semantic.warningBackground,
  },
  warningText: {
    ...typography.caption,
    flex: 1,
    color: theme.colors.semantic.warningText,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background.page,
  },
  continueButton: {
    minHeight: theme.sizes.primaryButtonHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.card,
    backgroundColor: colors.brand.primary,
  },
  continueButtonDisabled: {
    backgroundColor: colors.border.strong,
  },
  continueButtonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  continueButtonTextDisabled: {
    color: colors.text.muted,
  },
});
