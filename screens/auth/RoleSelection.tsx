import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
type Role = "student" | "tutor" | null;

export function RoleSelectionScreen(){
    const router = useRouter();
    const [role, setRole] = useState<Role>(null);
    const isValid = (role === 'student') || (role === 'tutor')

    function handleContinue() {
        Alert.alert('Next Phase','Firebase login and role routing will be added in the authentication sprint.');
    }
    function handleRolePress(selected: Role){
        setRole(selected);
    }
    return(
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.replace('/phone-entry')} style={styles.backButton}>
                        <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
                        <Text style={styles.backText}>Back</Text>
                    </Pressable>


                    <View style={styles.header}>
                        <Text style={styles.title}>How will you use EdumentX?</Text>
                        <Text style={styles.subtitle}>You will be asked once, you can't change later.</Text>
                    </View>

                    <View style={styles.cardsContainer}> 
                        {/*Student/Parent card*/}
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => handleRolePress('student')}
                            style = {[
                                styles.card,
                                role === 'student' && styles.cardSelectedBlue,
                            ]}
                        >
                            <View style={[styles.iconBox, styles.iconBoxBlue]}>
                                <Ionicons
                                    name="school-outline"
                                    size={26}
                                    color={colors.brand.primary}
                                /> 
                            </View>

                            <View style={styles.cardTextGroup}>
                                <Text style={styles.cardTitle}>Student / Parent</Text>
                                <Text style={styles.cardSubtitle}>Find Verified home tutors and enroll online.</Text>

                            </View>
                            {/*trailing icon*/}
                            {role === 'student'? (
                                <View style={styles.checkCircleBlue}>
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                </View>)
                                :(
                                 
                                 <Ionicons name="chevron-forward" size={20} color={colors.border.strong} />
                            )}
                        </Pressable>
                    </View>
                    
                    <View style={styles.cardsContainer}> 
                        {/*Tutor card*/}
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => handleRolePress('tutor')}
                            style = {[
                                styles.card,
                                role === 'tutor' && styles.cardSelectedGreen,
                            ]}
                        >
                            <View style={[styles.iconBox, styles.iconBoxGreen]}>
                                <Ionicons
                                    name="book-outline"
                                    size={26}
                                    color={colors.brand.verification}
                                /> 
                            </View>

                            <View style={styles.cardTextGroup}>
                                <Text style={styles.cardTitle}>Tutor</Text>
                                <Text style={styles.cardSubtitle}>List your services and earn from teaching</Text>

                            </View>
                            {/*trailing icon*/}
                            {role === 'tutor'? (
                                <View style={styles.checkCircleGreen}>
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                </View>)
                                :(
                                 
                                 <Ionicons name="chevron-forward" size={20} color={colors.border.strong} />
                            )}
                        </Pressable>
                    </View>

                    {/*Warning*/}

                    <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                            ⚠️ Choose carefully - this can't be changed later.
                        </Text>
                    </View>

                </ScrollView>
                
                <View style={styles.footer}>
                    <Pressable
                        onPress = {handleContinue}
                        disabled={!isValid}
                        style = {[
                            styles.continueButton,
                            !isValid && styles.continueButtonDisabled,
                        ]}
                    >
                        <Text style={[
                            styles.continueButtonText,
                            !isValid && styles.continueButtonTextDisabled
                            ]}> Continue</Text>
                    </Pressable>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
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
 
    // Back button
    backButton: {
        minHeight: 44,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    backText: {
        ...typography.body,
        color: colors.brand.primary,
    },
 
    // Header
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
 
    // Cards container
    cardsContainer: {
        gap: spacing.md,
        marginBottom: spacing.sm
    },

    // Base card
    card: {
        backgroundColor: colors.background.surface,
        borderWidth: 0.5,
        borderColor: colors.border.default,
        borderRadius: 14,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    // Selected states — just override border
    cardSelectedBlue: {
        borderWidth: 1.0,
        borderColor: colors.brand.primary,
    },
    cardSelectedGreen: {
        borderWidth: 1.0,
        borderColor: colors.brand.verification,
    },
 
    // Icon box
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    iconBoxBlue: {
        backgroundColor: colors.onboarding.mapBackground,   // #E8F0FE
    },
    iconBoxGreen: {
        backgroundColor: colors.onboarding.verifyBackground, // #E0F5EE
    },
 
    // Card text
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
 
    // Check circles
    checkCircleBlue: {
        width: 22,
        height: 22,
        borderRadius: 999,
        backgroundColor: colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleGreen: {
        width: 22,
        height: 22,
        borderRadius: 999,
        backgroundColor: colors.brand.verification,
        alignItems: 'center',
        justifyContent: 'center',
    },
 
    // Warning banner
    warningBanner: {
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: spacing.md,
    },
    warningText: {
        ...typography.caption,
        color: '#92400E',
    },
 
    // Footer / Continue button
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
        paddingTop: spacing.md,
        backgroundColor: colors.background.page,
    },
    continueButton: {
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: colors.brand.primary,
    },
    continueButtonDisabled: {
        backgroundColor: colors.border.strong,
    },
    continueButtonText: {
        ...typography.button,
        fontSize: 15,
        color: colors.text.inverse,
    },
    continueButtonTextDisabled: {
        color: colors.text.muted,
    },
});