import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Text, XStack, YStack } from "tamagui";

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

    router.push(role === "tutor" ? "/profile-tutor" : "/profile-student");
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.page }}
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <XStack
            accessibilityRole="button"
            hitSlop={12}
            minHeight={theme.sizes.touchTarget}
            alignSelf="flex-start"
            alignItems="center"
            gap={spacing.xs}
            marginBottom={spacing.md}
            onPress={() => router.replace("/create_password")}
            pressStyle={{ opacity: 0.7 }}
          >
            <Ionicons
              color={colors.brand.primary}
              name="chevron-back"
              size={18}
            />
            <Text {...typography.body} color={colors.brand.primary}>
              Back
            </Text>
          </XStack>

          <YStack gap={spacing.sm} marginBottom={spacing.xl}>
            <Text {...typography.overline} color={colors.brand.primary}>
              Step 3 of 4
            </Text>
            <Text {...typography.heroTitle} color={colors.text.onboardingTitle}>
              How will you use EdumentX?
            </Text>
            <Text {...typography.body} color={colors.text.secondary}>
              Select your role once during signup. Admin approval is required to
              change it later.
            </Text>
          </YStack>

          <YStack gap={spacing.md}>
            <RoleCard
              active={role === "student"}
              iconColor={colors.brand.primary}
              iconName="school-outline"
              iconBg={colors.onboarding.mapBackground}
              activeBorder={colors.brand.primary}
              onPress={() => handleRolePress("student")}
              subtitle="Find verified home tutors and manage enrollments."
              title="Student / Parent"
            />

            <RoleCard
              active={role === "tutor"}
              iconColor={colors.brand.verification}
              iconName="book-outline"
              iconBg={colors.onboarding.verifyBackground}
              activeBorder={colors.brand.verification}
              onPress={() => handleRolePress("tutor")}
              subtitle="List your teaching services and receive enrollment requests."
              title="Tutor"
            />
          </YStack>

          {/* <XStack
            alignItems="flex-start"
            gap={spacing.sm}
            marginTop={spacing.lg}
            padding={spacing.md}
            borderRadius={theme.radii.card}
            backgroundColor={theme.colors.semantic.warningBackground}
          >
            <Ionicons
              color={colors.semantic.warning}
              name="alert-circle-outline"
              size={18}
            />
            <Text {...typography.caption} flex={1} color={theme.colors.semantic.warningText}>
              Choose carefully. Role changes should go through admin approval
              later.
            </Text>
          </XStack> */}
        </ScrollView>

        <YStack
          paddingHorizontal={spacing.xl}
          paddingTop={spacing.md}
          paddingBottom={spacing.xxl}
          backgroundColor={colors.background.page}
        >
          <Button
            accessibilityRole="button"
            accessibilityLabel="Continue"
            disabled={!canContinue}
            minHeight={theme.sizes.primaryButtonHeight}
            alignItems="center"
            justifyContent="center"
            borderRadius={theme.radii.card}
            style={{
              backgroundColor: canContinue
                ? colors.brand.primary
                : colors.border.strong,
            }}
            onPress={handleContinue}
            pressStyle={{
              backgroundColor: canContinue
                ? colors.brand.primary
                : colors.border.strong,
            }}
          >
            <Text
              {...typography.button}
              color={canContinue ? colors.text.inverse : colors.text.muted}
            >
              Continue
            </Text>
          </Button>
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface RoleCardProps {
  active: boolean;
  iconColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  activeBorder: string;
  onPress: () => void;
  subtitle: string;
  title: string;
}

function RoleCard({
  active,
  iconColor,
  iconName,
  iconBg,
  activeBorder,
  onPress,
  subtitle,
  title,
}: RoleCardProps) {
  return (
    <Button
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      minHeight={92}
      flexDirection="row"
      alignItems="center"
      gap={spacing.md}
      padding={spacing.lg}
      borderWidth={active ? 1 : 0.5}
      borderColor={active ? activeBorder : colors.border.default}
      borderRadius={theme.radii.lg}
      backgroundColor={colors.background.surface}
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack
        width={52}
        height={52}
        flexShrink={0}
        alignItems="center"
        justifyContent="center"
        borderRadius={theme.radii.card}
        backgroundColor={iconBg}
      >
        <Ionicons color={iconColor} name={iconName} size={26} />
      </YStack>

      <YStack flex={1} gap={spacing.xs}>
        <Text {...typography.cardTitle} color={colors.text.onboardingTitle}>
          {title}
        </Text>
        <Text {...typography.body} color={colors.text.secondary}>
          {subtitle}
        </Text>
      </YStack>

      {active ? (
        <YStack
          width={22}
          height={22}
          alignItems="center"
          justifyContent="center"
          borderRadius={theme.radii.circle}
          style={{ backgroundColor: iconColor }}
        >
          <Ionicons color={colors.text.inverse} name="checkmark" size={14} />
        </YStack>
      ) : (
        <Ionicons
          color={colors.border.strong}
          name="chevron-forward"
          size={20}
        />
      )}
    </Button>
  );
}
