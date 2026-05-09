import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const setupItems = [
  'Expo Router entry is ready',
  'Core folders are reserved for each app area',
  'Firebase rule files are in place',
  'README and setup documentation are available',
];

export default function AppNavigator() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Initial setup</Text>
          <Text style={styles.title}>EdumentX</Text>
          <Text style={styles.subtitle}>
            A starter shell for the location-based tutor discovery platform.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Project status</Text>
          {setupItems.map((item) => (
            <View key={item} style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.roleGrid}>
          <View style={styles.roleCard}>
            <Text style={styles.roleTitle}>Student</Text>
            <Text style={styles.roleText}>Home, map search, enrollments, AI chat, and profile screens.</Text>
          </View>
          <View style={styles.roleCard}>
            <Text style={styles.roleTitle}>Tutor</Text>
            <Text style={styles.roleText}>Dashboard, inbox, batches, verification, and profile screens.</Text>
          </View>
          <View style={styles.roleCard}>
            <Text style={styles.roleTitle}>Admin</Text>
            <Text style={styles.roleText}>Verification queue, user management, statistics, and settings.</Text>
          </View>
        </View>

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Ready for feature branches</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.page,
  },
  container: {
    padding: spacing.page,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  kicker: {
    ...typography.overline,
    color: colors.brand.primary,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surface,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text.primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.semantic.success,
  },
  statusText: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
  roleGrid: {
    gap: spacing.md,
  },
  roleCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surface,
  },
  roleTitle: {
    ...typography.cardTitle,
    color: colors.text.primary,
  },
  roleText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },
  buttonText: {
    ...typography.button,
    color: colors.text.inverse,
  },
});
