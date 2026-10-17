import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, TextInput, View, StyleSheet } from 'react-native';
import { useUser } from '@clerk/expo';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { CheckCircle2 } from 'lucide-react-native';

import { c, font, radius } from '@/src/theme/visitTokens';
import { Button } from '@/src/components/visit/Button';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { refreshVisitCompletion, useVisitsStore } from '@/src/store/visitsStore';
import {
  FOLLOW_UP_RESPONSE_LABELS,
  LANDLORD_FOLLOW_UP_LABELS,
  TIME_SLOT_LABELS,
  formatVisitDate,
  type FollowUpResponse,
  type LandlordFollowUpOutcome,
} from '@/src/types/property.types';

export type FollowUpPromptRole = 'tenant' | 'landlord';

/**
 * Visit ids pushed aside with "Decide later" — session-scoped so a
 * dismissed prompt returns on the next cold app open (product rule: nag
 * until answered) but never nags twice within one session.
 */
const dismissedThisSession = new Set<string>();

interface FollowUpPromptProps {
  role: FollowUpPromptRole;
}

const DANGER = '#C0392B';

/**
 * Auto-appearing post-visit follow-up drawer. Mounted once per role area:
 *   <FollowUpPrompt role="tenant" /> inside (tenant)/_layout.tsx
 *   <FollowUpPrompt role="landlord" /> inside (landlord)/_layout.tsx
 *
 * On every focus / foreground it lazily completes past-window visits on
 * the server (mark_past_visits_completed), refetches, and — if this user
 * still owes an answer — slides up a bottom sheet for the oldest pending
 * visit. Both parties of the same visit are prompted independently; once
 * both answer, the server reconciles the final status atomically.
 */
export function FollowUpPrompt({ role }: FollowUpPromptProps) {
  const supabase = useClerkSupabase();
  const { user: clerkUser } = useUser();
  const clerkId = clerkUser?.id;

  const sheetRef = useRef<BottomSheetModal>(null);
  const [promptVisitId, setPromptVisitId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const tenantVisits = useVisitsStore((s) => s.tenantVisits);
  const landlordVisits = useVisitsStore((s) => s.landlordVisits);

  const submitTenantFollowUp = useVisitsStore((s) => s.submitFollowUp);
  const submitLandlordOutcome = useVisitsStore((s) => s.landlordSubmitFollowUp);

  // ── Trigger: focus + foreground ────────────────────────────────────────────

  const checkForPending = useCallback(async () => {
    if (!clerkId) return;
    await refreshVisitCompletion(supabase, clerkId, role);

    const store = useVisitsStore.getState();
    const pool =
      role === 'tenant'
        ? store.tenantVisits.filter((v) => v.followUpPending)
        : store.landlordVisits.filter(
            (v) =>
              v.status === 'VISIT_COMPLETED' &&
              v.landlordFollowUpOutcome == null &&
              v.tenantFollowUpResponse != null
          );

    const next = pool
      .filter((v) => !dismissedThisSession.has(v.id))
      .sort((a, b) => a.requestedDate.localeCompare(b.requestedDate))[0];

    setPromptVisitId(next?.id ?? null);
    setSelected(null);
    setNote('');
  }, [clerkId, supabase, role]);

  // Re-check whenever this area gains focus (tab switches included).
  useEffect(() => {
    void checkForPending();
  }, [checkForPending]);

  // Re-check when the app returns to foreground — no cold restart needed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForPending();
    });
    return () => subscription.remove();
  }, [checkForPending]);

  // ── Sheet presentation ─────────────────────────────────────────────────────

  useEffect(() => {
    if (promptVisitId) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [promptVisitId]);

  const visit =
    role === 'tenant'
      ? tenantVisits.find((v) => v.id === promptVisitId)
      : landlordVisits.find((v) => v.id === promptVisitId);

  const handleDismiss = useCallback(() => {
    if (promptVisitId) dismissedThisSession.add(promptVisitId);
    setPromptVisitId(null);
  }, [promptVisitId]);

  const handleSubmit = useCallback(async () => {
    if (!visit || !selected) return;
    setBusy(true);

    let ok: boolean;
    if (role === 'tenant') {
      ok = await submitTenantFollowUp(
        visit.id,
        selected as FollowUpResponse,
        note.trim() || null,
        supabase
      );
    } else {
      ok = await submitLandlordOutcome(
        visit.id,
        selected as LandlordFollowUpOutcome,
        supabase
      );
    }
    setBusy(false);

    if (!ok) return; // Store already re-fetched server truth on failure.

    dismissedThisSession.add(visit.id);
    setPromptVisitId(null);
  }, [visit, selected, note, role, submitTenantFollowUp, submitLandlordOutcome, supabase]);

  // ── Options per role ───────────────────────────────────────────────────────

  const options: { value: string; label: string; danger?: boolean }[] =
    role === 'tenant'
      ? (Object.entries(FOLLOW_UP_RESPONSE_LABELS) as [FollowUpResponse, string][]).map(
          ([value, label]) => ({ value, label, danger: value === 'not_a_fit' })
        )
      : (
          Object.entries(LANDLORD_FOLLOW_UP_LABELS) as [LandlordFollowUpOutcome, string][]
        ).map(([value, label]) => ({
          value,
          label,
          danger: value === 'tenant_did_not_visit',
        }));

  const headline = role === 'tenant' ? 'How was your visit?' : 'Did the visit happen?';

  return (
    <BottomSheetModalProvider>
      <BottomSheetModal
        ref={sheetRef}
        backgroundStyle={s.sheetBg}
        handleIndicatorStyle={s.handle}
        enableDynamicSizing
        enablePanDownToClose={false}
        enableDismissOnClose={false}>
        <BottomSheetScrollView contentContainerStyle={s.content} bounces={false}>
          <View style={s.header}>
            <CheckCircle2 size={22} color={c.accent} strokeWidth={2.2} />
            <Text style={s.title}>{headline}</Text>
          </View>

          {visit && (
            <Text style={s.subtitle}>
              {visit.propertyTitle ?? 'The property'} ·{' '}
              {formatVisitDate(visit.requestedDate)} · {TIME_SLOT_LABELS[visit.timeSlot]}
            </Text>
          )}

          <View style={s.options}>
            {options.map((opt) => {
              const active = selected === opt.value;
              return (
                <Text
                  key={opt.value}
                  onPress={() => setSelected(opt.value)}
                  style={[
                    s.option,
                    active && s.optionActive,
                    opt.danger && !active && s.optionDanger,
                  ]}>
                  {active ? '●  ' : '○  '}
                  {opt.label}
                </Text>
              );
            })}
          </View>

          {role === 'tenant' && selected != null && (
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add an optional note…"
              placeholderTextColor={c.faint}
              multiline
              style={s.noteInput}
            />
          )}

          <Button onPress={handleSubmit} disabled={!selected || busy}>
            {busy ? 'Submitting…' : 'Submit'}
          </Button>

          <Text onPress={handleDismiss} style={s.later}>
            Decide later
          </Text>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  sheetBg: {
    backgroundColor: c.screenBg,
    borderRadius: radius.card,
  },
  handle: {
    backgroundColor: c.border,
    width: 44,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 8,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 20,
    color: c.title,
  },
  subtitle: {
    fontFamily: font.sans,
    fontSize: 13,
    color: c.meta,
    marginTop: -6,
  },
  options: {
    gap: 10,
    marginTop: 2,
  },
  option: {
    fontFamily: font.sans,
    fontSize: 15,
    color: c.body,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: c.border,
    overflow: 'hidden',
  },
  optionActive: {
    borderColor: c.accent,
    backgroundColor: c.greenBg,
    color: c.accent,
    fontFamily: font.sansSemi,
  },
  optionDanger: {
    color: DANGER,
  },
  noteInput: {
    fontFamily: font.sans,
    fontSize: 14,
    color: c.title,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: radius.control,
    padding: 12,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  later: {
    fontFamily: font.sans,
    fontSize: 13,
    color: c.faint,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
