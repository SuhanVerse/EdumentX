import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { ArrowRight, Calendar, Clock } from 'lucide-react-native';

import { Avatar, LdSectionLabel, ScreenShell } from '@/src/components/visit/LandlordUI';
import { useVisitsStore } from '@/src/store/visitsStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { c, font, radius } from '@/src/theme/visitTokens';
import { toTimeSlot, weekdayShort, type TimeSlot } from '@/src/types/property.types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TIMES = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'];

/** Representative start time for a stored slot — the compact display form. */
const SLOT_START: Record<TimeSlot, string> = {
  MORNING: '9:00 AM',
  AFTERNOON: '12:00 PM',
  EVENING: '4:00 PM',
};

/** ISO + slot → `"Mon, Jun 9 · 4:00 PM"`. */
const compactVisit = (iso: string, slot: TimeSlot): string => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${date} · ${SLOT_START[slot]}`;
};

interface DayOption {
  iso: string;
  weekday: string;
  dayNum: number;
  month: string;
}

const buildDays = (): DayOption[] => {
  const out: DayOption[] = [];
  const now = new Date();
  for (let offset = 1; offset <= 6; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    out.push({
      iso: d.toISOString().slice(0, 10),
      weekday: weekdayShort(d.toISOString().slice(0, 10)).slice(0, 3),
      dayNum: d.getDate(),
      month: MONTHS[d.getMonth()],
    });
  }
  return out;
};

export default function LandlordRescheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supabase = useClerkSupabase();
  const { user } = useUser();

  const row = useVisitsStore((s) => s.landlordVisits.find((v) => v.id === id));
  const landlordVisits = useVisitsStore((s) => s.landlordVisits);
  const fetchLandlordVisits = useVisitsStore((s) => s.fetchLandlordVisits);
  const rescheduleVisit = useVisitsStore((s) => s.rescheduleVisit);

  const days = useMemo(buildDays, []);
  const [dayIdx, setDayIdx] = useState(1);
  const [timeIdx, setTimeIdx] = useState(4);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id && landlordVisits.length === 0 && user?.id) {
      fetchLandlordVisits(supabase, user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const original = row ? compactVisit(row.requestedDate, row.timeSlot) : '';

  const day = days[dayIdx] ?? days[0];
  const time = TIMES[timeIdx] ?? TIMES[0];
  const proposal = `${day.weekday}, ${day.month} ${day.dayNum} · ${time}`;
  const note = `Sorry, I have a conflict at the original time — does ${day.weekday} ${day.dayNum} work for you?`;

  const handleSend = useCallback(async () => {
    if (!row || !id || sending) return;
    setSending(true);
    const ok = await rescheduleVisit(id, day.iso, toTimeSlot(time), note, supabase);
    setSending(false);
    if (!ok) return;
    router.push({
      pathname: '/(landlord)/reschedule-sent',
      params: { tenant: row.tenantName ?? 'the tenant', proposal, original },
    } as any);
  }, [row, id, sending, day, time, note, proposal, original, rescheduleVisit, supabase, router]);

  if (!row) {
    return (
      <ScreenShell title="Reschedule Visit" showBack paddingBottom={32}>
        <View style={styles.center}>
          {landlordVisits.length === 0 ? (
            <ActivityIndicator color="#1A6B4A" />
          ) : (
            <Text style={styles.centerText}>This request is no longer available.</Text>
          )}
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Reschedule Visit" showBack paddingBottom={32}>
      {/* Applicant context */}
      <View style={styles.contextPanel}>
        <Avatar name={row.tenantName ?? 'Tenant'} size={40} />
        <View style={styles.contextCopy}>
          <Text style={styles.contextName}>{row.tenantName ?? 'A tenant'}</Text>
          <Text style={styles.contextMeta}>Original: {original}</Text>
        </View>
      </View>

      {/* Pick a day */}
      <LdSectionLabel label="Pick a Day" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScroll}
        contentContainerStyle={styles.dayRow}>
        {days.map((d, i) => {
          const active = i === dayIdx;
          return (
            <TouchableOpacity
              key={d.iso}
              onPress={() => setDayIdx(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              activeOpacity={0.8}
              style={[styles.dayTile, active && styles.dayTileActive]}>
              <Text style={[styles.dayWeekday, active && styles.dayWeekdayActive]}>
                {d.weekday}
              </Text>
              <Text style={[styles.dayNum, active && styles.dayNumActive]}>{d.dayNum}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Pick a time */}
      <LdSectionLabel label="Pick a Time" />
      <View style={styles.timeGrid}>
        {TIMES.map((t, i) => {
          const active = i === timeIdx;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTimeIdx(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              activeOpacity={0.8}
              style={[styles.timeCell, active && styles.timeCellActive]}>
              <Clock size={11} color={active ? '#FFFFFF' : c.ink} strokeWidth={2} />
              <Text style={[styles.timeText, active && styles.timeTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Live proposal */}
      <View style={styles.proposalPanel}>
        <View style={styles.proposalIcon}>
          <Calendar size={17} color="#FFFFFF" strokeWidth={2} />
        </View>
        <View style={styles.proposalCopy}>
          <Text style={styles.proposalLabel}>NEW PROPOSAL</Text>
          <Text style={styles.proposalValue}>{proposal}</Text>
        </View>
      </View>

      {/* Note */}
      <LdSectionLabel label="Note to Tenant" />
      <View style={styles.noteCard}>
        <Text style={styles.noteText}>{note}</Text>
      </View>

      {/* Send */}
      <TouchableOpacity
        onPress={handleSend}
        disabled={sending}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Send new time"
        style={[styles.sendBtn, sending && styles.disabled]}>
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={styles.sendRow}>
            <Text style={styles.sendText}>Send new time</Text>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
          </View>
        )}
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  centerText: {
    fontFamily: font.sans,
    fontSize: 13,
    color: c.meta,
  },
  contextPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    padding: 12,
  },
  contextCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  contextName: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  contextMeta: {
    marginTop: 3,
    fontFamily: font.sans,
    fontSize: 11,
    color: c.faint,
  },
  dayScroll: {
    flexGrow: 0,
  },
  dayRow: {
    paddingRight: 8,
  },
  dayTile: {
    width: 54,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceGrey,
    marginRight: 8,
  },
  dayTileActive: {
    backgroundColor: c.ink,
  },
  dayWeekday: {
    fontFamily: font.sans,
    fontSize: 10,
    color: c.meta,
    opacity: 0.6,
  },
  dayWeekdayActive: {
    color: '#FFFFFF',
  },
  dayNum: {
    marginTop: 6,
    fontFamily: font.sansSemi,
    fontSize: 19,
    color: c.ink,
  },
  dayNumActive: {
    color: '#FFFFFF',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeCell: {
    width: '31%',
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceGrey,
    marginRight: '3.5%',
    marginBottom: 10,
  },
  timeCellActive: {
    backgroundColor: c.ink,
  },
  timeText: {
    fontFamily: font.sansSemi,
    fontSize: 12,
    color: c.ink,
    marginLeft: 6,
  },
  timeTextActive: {
    color: '#FFFFFF',
  },
  proposalPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FEF3DC',
    padding: 16,
  },
  proposalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposalCopy: {
    flex: 1,
    marginLeft: 14,
  },
  proposalLabel: {
    fontFamily: font.sansSemi,
    fontSize: 10,
    letterSpacing: 1,
    color: '#B45309',
  },
  proposalValue: {
    marginTop: 4,
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  noteText: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 18,
    color: c.meta,
  },
  sendBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendText: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: '#FFFFFF',
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
