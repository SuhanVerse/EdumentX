import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Home, Building2, DoorOpen, BedDouble } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';

const { color, space, radius, font, size } = tokens;

// ─── Property Types ──────────────────────────────────────────────────────────

interface PropertyType {
  key: string;
  label: string;
  sub: string;
  icon: React.ElementType;
}

const TYPES: PropertyType[] = [
  { key: 'Apartment', label: 'Apartment', sub: 'Flat in a building', icon: Home },
  { key: 'House', label: 'House', sub: 'Standalone house', icon: Building2 },
  { key: 'Room', label: 'Room', sub: 'Single room to rent', icon: DoorOpen },
  { key: 'Studio', label: 'Studio', sub: 'Open layout flat', icon: BedDouble },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NewListingStep1() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>('Apartment');

  const handleGoBack = useCallback(() => router.back(), [router]);

  const handleContinue = useCallback(() => {
    router.push({
      pathname: '/(landlord)/listing/new/step-2',
      params: { propertyType: selected },
    } as any);
  }, [router, selected]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={handleGoBack} style={styles.backButton} accessibilityLabel="Go back">
          <ArrowLeft size={18} color={color.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>New Listing</Text>
        </View>
      </View>

      {/* ─── Step Info + Progress Bar ────────────────────────────────── */}
      <View style={styles.progressSection}>
        <Text style={styles.stepLabel}>Step 1 of 4</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '25%' }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ─── Headline ──────────────────────────────────────────────── */}
        <Text style={styles.headline}>What type of property?</Text>
        <Text style={styles.subtext}>Step 2 will adapt to your choice.</Text>

        {/* ─── 2x2 Grid ──────────────────────────────────────────────── */}
        <View style={styles.grid}>
          {TYPES.map((item) => {
            const active = item.key === selected;
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                onPress={() => setSelected(item.key)}
                style={[styles.gridCard, active && styles.gridCardActive]}
                accessibilityLabel={item.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}>
                <Icon
                  size={28}
                  color={active ? color.bg : color.ink}
                  strokeWidth={1.5}
                />
                <Text style={[styles.gridLabel, active && styles.gridLabelActive]}>
                  {item.label}
                </Text>
                <Text style={[styles.gridSub, active && styles.gridSubActive]}>
                  {item.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* ─── Sticky Bottom ────────────────────────────────────────────── */}
      <View style={styles.bottomArea}>
        <Pressable
          onPress={handleContinue}
          style={styles.cta}
          accessibilityLabel="Continue"
          accessibilityRole="button">
          <Text style={styles.ctaText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },

  // Header
  header: {
    height: space.headerH,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    paddingHorizontal: space.screenH,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 40,
  },
  headerTitle: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink,
  },

  // Progress
  progressSection: {
    paddingHorizontal: space.screenH,
    paddingTop: 12,
    paddingBottom: 4,
  },
  stepLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: color.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: color.ink,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.screenH,
    paddingTop: 28,
    paddingBottom: 24,
  },

  // Headline
  headline: {
    fontFamily: font.display,
    fontSize: 28,
    color: color.ink,
    marginBottom: 6,
  },
  subtext: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    marginBottom: 28,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '47%',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.bg,
    padding: 20,
    paddingTop: 24,
    gap: 6,
  },
  gridCardActive: {
    backgroundColor: color.ink,
    borderColor: color.ink,
  },
  gridLabel: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
    marginTop: 8,
  },
  gridLabelActive: {
    color: color.bg,
  },
  gridSub: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink2,
  },
  gridSubActive: {
    color: 'rgba(255,255,255,0.65)',
  },

  // Bottom CTA
  bottomArea: {
    paddingHorizontal: space.screenH,
    paddingBottom: space.safeBottom + 8,
    paddingTop: 8,
  },
  cta: {
    height: space.buttonH,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.bg,
  },
});
