import { useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Star } from 'lucide-react-native';

import { c, font, radius, sp, t } from '@/src/theme/visitTokens';
import { DetailHeader } from '@/src/components/visit/DetailHeader';
import { VStack } from '@/src/components/visit/VStack';
import { SectionLabel } from '@/src/components/visit/SectionLabel';
import { Button } from '@/src/components/visit/Button';
import { useVisitsStore } from '@/src/store/visitsStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import {
  FOLLOW_UP_RESPONSE_LABELS,
  TIME_SLOT_LABELS,
  formatVisitDate,
  type FollowUpResponse,
} from '@/src/types/property.types';

// ─── Options ─────────────────────────────────────────────────────────────────

const TAGS = [
  'Clean & tidy',
  'Accurate listing',
  'Responsive host',
  'Good value',
  'Spacious',
  'Safe area',
] as const;

const RATING_COUNT = 5;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PostVisitFollowUpScreen() {
  const router = useRouter();
  const supabase = useClerkSupabase();
  const { visitId } = useLocalSearchParams<{ visitId: string }>();

  const visit = useVisitsStore((s) => s.tenantVisits.find((v) => v.id === visitId));
  const submitFollowUp = useVisitsStore((s) => s.submitFollowUp);

  const [response, setResponse] = useState<FollowUpResponse | null>(null);
  const [rating, setRating] = useState(4);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!visitId || !response) return;
    setBusy(true);
    // The chosen response drives the visit status server-side; the written
    // comment rides along as the follow-up note. (Ratings/tags stay local
    // until a reviews table exists.)
    const ok = await submitFollowUp(visitId, response, comment.trim() || null, supabase);
    setBusy(false);
    if (!ok) {
      Alert.alert('Could not submit', 'Please try again.');
      return;
    }
    router.back();
  }, [visitId, response, comment, submitFollowUp, supabase, router]);

  const timeLabel = visit ? TIME_SLOT_LABELS[visit.timeSlot] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <DetailHeader title="Follow-Up" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <VStack gap={sp.lg}>
          {/* Property reference row */}
          {visit && (
            <View style={styles.reference}>
              <View style={styles.thumb}>
                {visit.propertyPhotoUrl ? (
                  <Image
                    source={{ uri: visit.propertyPhotoUrl }}
                    style={styles.thumbImg}
                    resizeMode="cover"
                  />
                ) : (
                  <MapPin size={14} color={c.icon} strokeWidth={1.75} />
                )}
              </View>
              <View style={styles.refBody}>
                <Text numberOfLines={1} style={styles.refTitle}>
                  {visit.propertyTitle ?? 'Property'}
                </Text>
                <Text style={styles.refMeta}>
                  Visited {formatVisitDate(visit.requestedDate)}
                  {timeLabel ? ` · ${timeLabel}` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Moment */}
          <View style={styles.moment}>
            <Text style={styles.momentTitle}>How was your visit?</Text>
            <Text style={styles.momentSub}>Tell us where things stand</Text>
          </View>

          {/* Response options — drive the visit status server-side */}
          <VStack gap={sp.base}>
            {(
              Object.entries(FOLLOW_UP_RESPONSE_LABELS) as [FollowUpResponse, string][]
            ).map(([value, label]) => {
              const active = response === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setResponse(value)}
                  style={[styles.responseOption, active && styles.responseOptionActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}>
                  <Text
                    style={[
                      styles.responseText,
                      active && styles.responseTextActive,
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </VStack>

          {/* Star rating */}
          <View style={styles.stars} accessibilityRole="radiogroup">
            {Array.from({ length: RATING_COUNT }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                style={n > 1 ? styles.starSpacing : undefined}
                onPress={() => setRating(n)}
                accessibilityRole="radio"
                accessibilityState={{ selected: rating === n }}
                accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
                hitSlop={6}>
                <Star
                  size={24}
                  strokeWidth={1.75}
                  color={n <= rating ? '#E9A93A' : '#DCDCDC'}
                  fill={n <= rating ? '#E9A93A' : 'transparent'}
                />
              </Pressable>
            ))}
          </View>

          {/* What stood out? */}
          <VStack gap={sp.base}>
            <SectionLabel label="What stood out?" />
            <View style={styles.tags}>
              {TAGS.map((tag) => {
                const active = selectedTags.has(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tag, active && styles.tagActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={tag}>
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
          </VStack>

          {/* Additional comments */}
          <VStack gap={sp.base}>
            <SectionLabel label="Additional comments" />
            <TextInput
              style={styles.input}
              placeholder="Write your thoughts here…"
              placeholderTextColor={c.faint}
              multiline
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
          </VStack>

          {/* Actions */}
          <View style={styles.actions}>
            <Button variant="accent" onPress={handleSubmit} disabled={busy || !response}>
              Submit
            </Button>
            <Button
              variant="link"
              onPress={() => router.back()}
              disabled={busy}
              style={{ marginTop: sp.xs }}>
              Skip for now
            </Button>
          </View>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.screenBg },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: sp.lg,
    paddingTop: sp.base,
    paddingBottom: 60,
  },
  // Reference row
  responseOption: {
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: radius.control,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  responseOptionActive: {
    borderColor: c.accent,
    backgroundColor: c.greenBg,
  },
  responseText: {
    fontFamily: font.sans,
    fontSize: 15,
    color: c.body,
  },
  responseTextActive: {
    fontFamily: font.sansSemi,
    color: c.accent,
  },
  reference: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: sp.base,
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: radius.thumb,
    backgroundColor: '#DADED4',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  refTitle: {
    fontFamily: font.sansSemi,
    fontSize: t.body,
    color: c.title,
  },
  refMeta: {
    marginTop: 2,
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.meta,
  },
  // Moment
  moment: {
    alignItems: 'center',
    paddingVertical: sp.base,
  },
  momentTitle: {
    fontFamily: font.serif,
    fontSize: t.moment,
    color: c.title,
    lineHeight: 30,
  },
  momentSub: {
    marginTop: 4,
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.faint,
  },
  // Stars
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: sp.xs,
  },
  starSpacing: {
    marginLeft: sp.md,
  },
  // Tags
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: sp.lg,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    marginRight: sp.md,
    marginBottom: sp.md,
  },
  tagActive: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  tagText: {
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.body,
  },
  tagTextActive: {
    fontFamily: font.sansSemi,
    color: c.screenBg,
  },
  // Input
  input: {
    minHeight: 96,
    borderRadius: radius.control,
    backgroundColor: c.cardBg,
    padding: sp.base,
    fontFamily: font.sans,
    fontSize: t.body,
    color: c.title,
    lineHeight: 22,
  },
  // Actions
  actions: {
    marginTop: sp.sm,
  },
});
