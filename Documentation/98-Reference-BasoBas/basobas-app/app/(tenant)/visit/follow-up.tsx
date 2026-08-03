import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarClock, Check, Clock, Sparkles, XCircle } from 'lucide-react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';

import { tokens } from '@/src/theme/tokens';
import { PrimaryButton } from '@/src/components/shared/PrimaryButton';
import { FollowUpOptionCard } from '@/src/components/visits/FollowUpOptionCard';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getVisitRequestForTenant } from '@/src/services/visits.service';
import { useVisitsStore } from '@/src/store/visitsStore';
import { formatVisitDate, type FollowUpResponse } from '@/src/types/property.types';

const { color, space, radius, font, size } = tokens;

const NOTE_MAX = 200;

// ─── Options ─────────────────────────────────────────────────────────────────

const OPTIONS: {
  option: FollowUpResponse;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
}[] = [
  {
    option: 'interested',
    label: "Interested — I'd like to move forward",
    icon: <Sparkles size={17} color="#1A6B4A" strokeWidth={2.2} />,
    iconBg: '#E8F5EE',
  },
  {
    option: 'need_more_time',
    label: 'I need a bit more time to decide',
    icon: <Clock size={17} color="#6B7280" strokeWidth={2.2} />,
    iconBg: '#F3F4F6',
  },
  {
    option: 'not_a_fit',
    label: 'Not the right fit for me',
    icon: <XCircle size={17} color="#6B7280" strokeWidth={2.2} />,
    iconBg: '#F3F4F6',
  },
  {
    option: 'missed_visit_reschedule',
    label: "I wasn't able to make it — can we reschedule?",
    icon: <CalendarClock size={17} color="#1E40AF" strokeWidth={2.2} />,
    iconBg: '#DBEAFE',
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PostVisitFollowUpScreen() {
  const router = useRouter();
  const supabase = useClerkSupabase();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();

  const visit = useVisitsStore((s) => s.visits.find((v) => v.id === visitId));
  const upsertPartial = useVisitsStore((s) => s.upsertPartial);
  const submitFollowUp = useVisitsStore((s) => s.submitFollowUp);

  const [selected, setSelected] = useState<FollowUpResponse | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  const load = useCallback(async () => {
    if (!visitId) return;
    const result = await getVisitRequestForTenant(visitId, supabase);
    if (result.success && result.data) upsertPartial(result.data);
  }, [visitId, supabase, upsertPartial]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = useCallback(async () => {
    if (!selected || !visitId) return;
    setBusy(true);
    const ok = await submitFollowUp(visitId, selected, note.trim() || null, supabase);
    setBusy(false);
    if (!ok) {
      Alert.alert('Could not submit', 'Please try again.');
      return;
    }
    // Checkmark pop confirmation (same micro-interaction as the KYC
    // uploaded-document check), then return to the now read-only detail.
    setDone(true);
    checkScale.value = withDelay(
      80,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) })
    );
    checkOpacity.value = withDelay(80, withTiming(1, { duration: 400 }));
    setTimeout(() => router.back(), 900);
  }, [selected, note, visitId, submitFollowUp, supabase, router, checkScale, checkOpacity]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  const handleGoBack = useCallback(() => router.back(), [router]);

  if (done) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.doneWrap}>
          <Animated.View style={[styles.doneCircle, checkStyle]}>
            <Check size={32} color={color.bg} strokeWidth={3.5} />
          </Animated.View>
          <Text style={styles.doneTitle}>Feedback Sent</Text>
          <Text style={styles.doneSub}>Thanks for sharing — the landlord has been notified.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Back button */}
      <Pressable
        onPress={handleGoBack}
        className="absolute left-6 top-6 z-10 h-10 w-10 items-center justify-center rounded-pill bg-input"
        accessibilityLabel="Go back"
        accessibilityRole="button">
        <ArrowLeft size={18} color="#0A0A0A" strokeWidth={2.2} />
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ── Heading ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(50).duration(450).springify()}>
          <Text style={styles.heading}>How did your visit go?</Text>
          <Text style={styles.subheading}>
            {visit?.propertyTitle ?? 'Property'} ·{' '}
            {visit ? formatVisitDate(visit.requestedDate) : ''}
          </Text>
        </Animated.View>

        {/* ── Options ─────────────────────────────────────────────────── */}
        <View style={styles.options}>
          {OPTIONS.map((o, i) => (
            <Animated.View
              key={o.option}
              entering={FadeInDown.delay(150 + i * 70)
                .duration(400)
                .springify()}>
              <FollowUpOptionCard
                option={o.option}
                label={o.label}
                icon={o.icon}
                iconBg={o.iconBg}
                selected={selected === o.option}
                onPress={() => setSelected(o.option)}
              />
            </Animated.View>
          ))}
        </View>

        {/* ── Note ────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Anything else you’d like to share? (optional)</Text>
        <View style={styles.noteCard}>
          <TextInput
            style={styles.noteInput}
            placeholder="Anything else you'd like to share? (optional)"
            placeholderTextColor={color.placeholder}
            multiline
            maxLength={NOTE_MAX}
            value={note}
            onChangeText={setNote}
            textAlignVertical="top"
          />
        </View>
        <Text style={styles.counter}>
          {note.length}/{NOTE_MAX}
        </Text>

        {/* ── CTA ────────────────────────────────────────────────────── */}
        <View style={styles.ctaWrap}>
          <PrimaryButton
            label="Submit Feedback"
            onPress={handleSubmit}
            disabled={!selected}
            loading={busy}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.screenH,
    paddingTop: 32,
    paddingBottom: 48,
  },
  heading: {
    fontFamily: font.display,
    fontSize: 24,
    color: color.ink,
    lineHeight: 30,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    textAlign: 'center',
    marginTop: 6,
  },
  options: {
    gap: 12,
    marginTop: 24,
  },
  sectionLabel: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    marginTop: 24,
    marginBottom: 8,
  },
  noteCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.bg,
    padding: space.cardPad,
  },
  noteInput: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
    lineHeight: 22,
    minHeight: 80,
  },
  counter: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    textAlign: 'right',
    marginTop: 4,
  },
  ctaWrap: {
    marginTop: 28,
  },
  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  doneCircle: {
    width: 72,
    height: 72,
    borderRadius: 72,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontFamily: font.display,
    fontSize: 22,
    color: color.ink,
    marginTop: 16,
  },
  doneSub: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
});
