import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { rescheduleVisit } from '@/src/services/visits.service';
import { toTimeSlot } from '@/src/types/property.types';

const { color, space, radius, font, size } = tokens;

// ─── Day data ────────────────────────────────────────────────────────────────

interface DayOption {
  label: string;
  /** Day of month, shown on the card. */
  date: number;
  /** ISO `YYYY-MM-DD` — what actually gets written. */
  iso: string;
}

/** The next six days starting tomorrow — a suggested time must be in the future. */
function buildDays(): DayOption[] {
  const days: DayOption[] = [];
  for (let offset = 1; offset <= 6; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`,
    });
  }
  return days;
}

// ─── Time slots ──────────────────────────────────────────────────────────────

const TIME_SLOTS = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SuggestTimeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supabase = useClerkSupabase();

  const DAYS = useMemo(buildDays, []);
  const [selectedDate, setSelectedDate] = useState<number>(DAYS[0].date);
  const [selectedTime, setSelectedTime] = useState('4:00 PM');
  const [note, setNote] = useState(
    'Sorry, I have a conflict at the original time \u2014 would this work instead?',
  );
  const [submitting, setSubmitting] = useState(false);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSend = useCallback(async () => {
    if (!id) {
      Alert.alert('Missing request', 'Could not tell which request to reschedule.');
      return;
    }
    if (submitting) return;

    const day = DAYS.find((d) => d.date === selectedDate);
    if (!day) return;

    setSubmitting(true);
    try {
      // The DB stores coarse slots, so the exact time is bucketed here.
      const result = await rescheduleVisit(
        id,
        day.iso,
        toTimeSlot(selectedTime),
        note.trim() || null,
        supabase,
      );
      if (!result.success) {
        Alert.alert('Could not suggest a new time', result.error);
        return;
      }

      router.replace({
        pathname: '/(landlord)/suggest-time-confirmation',
        params: { date: selectedDate.toString(), time: selectedTime },
      } as any);
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting, DAYS, selectedDate, selectedTime, note, supabase, router]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={handleGoBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button">
          <ArrowLeft size={18} color={color.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Suggest a different time</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ─── Info Banner ───────────────────────────────────────────── */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIcon}>
            <Calendar size={20} color="#FFFFFF" strokeWidth={2} />
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>Propose a new time</Text>
            <Text style={styles.infoSub}>The tenant will be notified to confirm.</Text>
          </View>
        </View>

        {/* ─── Pick a Day ────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PICK A DAY</Text>

        <View style={styles.dayRow}>
          {DAYS.map((d) => {
            const active = d.date === selectedDate;
            return (
              <Pressable
                key={d.date}
                onPress={() => setSelectedDate(d.date)}
                style={[styles.dayCard, active && styles.dayCardActive]}
                accessibilityLabel={`${d.label} ${d.date}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>
                  {d.label}
                </Text>
                <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>
                  {d.date}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Pick a Time ───────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PICK A TIME</Text>

        <View style={styles.timeGrid}>
          {TIME_SLOTS.slice(0, 3).map((time) => {
            const active = time === selectedTime;
            return (
              <Pressable
                key={time}
                onPress={() => setSelectedTime(time)}
                style={[styles.timePill, active && styles.timePillActive]}
                accessibilityLabel={time}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <Clock
                  size={14}
                  color={active ? color.bg : color.ink2}
                  strokeWidth={2}
                />
                <Text style={[styles.timeText, active && styles.timeTextActive]}>
                  {time}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.timeGrid}>
          {TIME_SLOTS.slice(3).map((time) => {
            const active = time === selectedTime;
            return (
              <Pressable
                key={time}
                onPress={() => setSelectedTime(time)}
                style={[styles.timePill, active && styles.timePillActive]}
                accessibilityLabel={time}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}>
                <Clock
                  size={14}
                  color={active ? color.bg : color.ink2}
                  strokeWidth={2}
                />
                <Text style={[styles.timeText, active && styles.timeTextActive]}>
                  {time}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Note ──────────────────────────────────────────────────── */}
        <View style={styles.noteCard}>
          <TextInput
            style={styles.noteInput}
            placeholder="Note to tenant (optional)"
            placeholderTextColor={color.placeholder}
            multiline
            value={note}
            onChangeText={setNote}
            textAlignVertical="top"
          />
        </View>

        {/* ─── CTA ───────────────────────────────────────────────────── */}
        <Pressable
          onPress={handleSend}
          disabled={submitting}
          style={[styles.cta, submitting && styles.ctaDisabled]}
          accessibilityLabel="Send new time"
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting, busy: submitting }}>
          {submitting ? (
            <ActivityIndicator size="small" color={color.bg} />
          ) : (
            <Text style={styles.ctaText}>Send new time</Text>
          )}
        </Pressable>
      </ScrollView>
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

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.screenH,
    paddingTop: 20,
    paddingBottom: 48,
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E8',
    borderRadius: radius.card,
    padding: space.cardPad,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E67E22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },
  infoSub: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: '#A0522D',
    marginTop: 2,
  },

  // Section label
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: size.caption,
    color: color.ink3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 24,
  },

  // Day picker
  dayRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.card,
    backgroundColor: color.input,
    paddingVertical: 12,
  },
  dayCardActive: {
    backgroundColor: color.ink,
  },
  dayLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },
  dayLabelActive: {
    color: color.bg,
  },
  dayNumber: {
    fontFamily: font.bold,
    fontSize: 17,
    color: color.ink,
    marginTop: 4,
  },
  dayNumberActive: {
    color: color.bg,
  },

  // Time picker
  timeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  timePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.input,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  timePillActive: {
    backgroundColor: color.ink,
  },
  timeText: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink,
  },
  timeTextActive: {
    fontFamily: font.semibold,
    color: color.bg,
  },

  // Note input
  noteCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.bg,
    padding: space.cardPad,
    marginTop: 24,
  },
  noteInput: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink,
    lineHeight: 22,
    minHeight: 80,
  },

  // CTA
  cta: {
    height: space.buttonH,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.bg,
  },
});
