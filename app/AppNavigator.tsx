import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { User } from 'firebase/auth';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { isFirebaseConfigured, missingFirebaseEnvVars } from '@/services/firebase/config';
import {
  signInDevelopmentUser,
  signOutDevelopmentUser,
  signUpDevelopmentUser,
  subscribeToAuthUser,
} from '@/services/firebase/auth';

const setupItems = [
  'Expo Router entry is ready',
  'Core folders are reserved for each app area',
  'Firebase client setup is ready',
  'README and setup documentation are available',
];

type DevelopmentRole = 'student' | 'tutor';

export default function AppNavigator() {
  const [name, setName] = useState('Test Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+977');
  const [role, setRole] = useState<DevelopmentRole>('student');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('Create a development user to verify Auth and users/{uid}.');

  useEffect(() => subscribeToAuthUser(setCurrentUser), []);

  async function handleSignup() {
    setIsSubmitting(true);
    setMessage('Creating Firebase Auth user...');

    try {
      const user = await signUpDevelopmentUser({ name, email, password, phone, role });
      setMessage(`Created Auth user and Firestore users/${user.uid}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create development user.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin() {
    setIsSubmitting(true);
    setMessage('Signing in...');

    try {
      const user = await signInDevelopmentUser(email, password);
      setMessage(`Signed in as ${user.uid}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsSubmitting(true);
    setMessage('Signing out...');

    try {
      await signOutDevelopmentUser();
      setMessage('Signed out.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign out.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFormDisabled = isSubmitting || !isFirebaseConfigured;

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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Firebase development signup</Text>
          <Text style={styles.helperText}>
            This temporary panel creates a Firebase Auth user, then writes the starter profile to Firestore using
            the same UID as the document ID.
          </Text>

          {!isFirebaseConfigured ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>Missing Firebase env values:</Text>
              <Text style={styles.warningText}>{missingFirebaseEnvVars.join(', ')}</Text>
            </View>
          ) : null}

          <TextInput
            autoCapitalize="words"
            editable={!isSubmitting}
            onChangeText={setName}
            placeholder="Full name"
            style={styles.input}
            value={name}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            editable={!isSubmitting}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <TextInput
            editable={!isSubmitting}
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="+977XXXXXXXXXX"
            style={styles.input}
            value={phone}
          />

          <View style={styles.segmentedControl}>
            {(['student', 'tutor'] as const).map((option) => (
              <Pressable
                disabled={isSubmitting}
                key={option}
                onPress={() => setRole(option)}
                style={[styles.segmentButton, role === option ? styles.segmentButtonActive : null]}>
                <Text style={[styles.segmentText, role === option ? styles.segmentTextActive : null]}>
                  {option === 'student' ? 'Student' : 'Tutor'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <Pressable disabled={isFormDisabled} onPress={handleSignup} style={[styles.button, isFormDisabled && styles.buttonDisabled]}>
              <Text style={styles.buttonText}>Create test user</Text>
            </Pressable>
            <Pressable disabled={isFormDisabled} onPress={handleLogin} style={[styles.secondaryButton, isFormDisabled && styles.buttonDisabled]}>
              <Text style={styles.secondaryButtonText}>Sign in</Text>
            </Pressable>
          </View>

          {currentUser ? (
            <Pressable disabled={isSubmitting} onPress={handleLogout} style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>Sign out {currentUser.uid.slice(0, 8)}</Text>
            </Pressable>
          ) : null}

          <View style={styles.statusBox}>
            {isSubmitting ? <ActivityIndicator color={colors.brand.primary} /> : null}
            <Text style={styles.statusMessage}>{message}</Text>
            {currentUser ? <Text style={styles.uidText}>Current UID: {currentUser.uid}</Text> : null}
          </View>
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
    flex: 1,
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
  helperText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  warningBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: '#FFF7E6',
  },
  warningText: {
    ...typography.caption,
    color: colors.semantic.warning,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.page,
    color: colors.text.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 999,
  },
  segmentButtonActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primaryLight,
  },
  segmentText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  segmentTextActive: {
    color: colors.brand.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    backgroundColor: colors.background.surface,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.brand.primary,
  },
  outlineButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.semantic.danger,
  },
  outlineButtonText: {
    ...typography.button,
    color: colors.semantic.danger,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statusBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background.page,
  },
  statusMessage: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  uidText: {
    ...typography.caption,
    color: colors.text.primary,
  },
});
