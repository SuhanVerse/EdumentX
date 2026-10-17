import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';

import { c, font, radius, sp, t } from '@/src/theme/visitTokens';
import { weekdayShort, toTimeSlot } from '@/src/types/property.types';

interface DateTimePickerProps {
  /** Currently-selected ISO date (`YYYY-MM-DD`). */
  date: string;
  /** Currently-selected time label (e.g. "10:00 AM"). */
  time: string;
  onChangeDate: (iso: string) => void;
  onChangeTime: (label: string) => void;
}

/**
 * Build the next N ISO dates starting tomorrow (matches the suggest-time
 * screen's behavior — bookings are always in the future). Day cells are
 * 48×56 with a 10px radius; the selected day fills with #0A0A0A and
 * inverts the text.
 */
const useDayOptions = (): { iso: string; weekday: string; dayNum: number }[] => {
  return useMemo(() => {
    const days: { iso: string; weekday: string; dayNum: number }[] = [];
    for (let offset = 1; offset <= 7; offset++) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const iso = d.toISOString().slice(0, 10);
      days.push({ iso, weekday: weekdayShort(iso), dayNum: d.getDate() });
    }
    return days;
  }, []);
};

interface SlotGroup {
  title: string;
  slots: string[];
}

/** Time slots grouped by Morning / Afternoon / Evening (matches TIME_SLOT_LABELS). */
const SLOT_GROUPS: SlotGroup[] = [
  { title: 'Morning · 8–12', slots: ['8:30 AM', '10:00 AM', '11:30 AM'] },
  { title: 'Afternoon · 12–5', slots: ['1:00 PM', '2:30 PM', '4:00 PM'] },
  { title: 'Evening · 5–8', slots: ['5:30 PM', '6:30 PM'] },
];

export const DateTimePicker = ({ date, time, onChangeDate, onChangeTime }: DateTimePickerProps) => {
  const days = useDayOptions();

  return (
    <View>
      {/* Day picker */}
      <Text style={styles.sectionLabel}>Pick a day</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayRow}>
        {days.map((d) => {
          const active = d.iso === date;
          return (
            <Pressable
              key={d.iso}
              onPress={() => onChangeDate(d.iso)}
              style={[styles.dayCell, active && styles.dayCellActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${d.weekday} ${d.dayNum}`}>
              <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{d.weekday}</Text>
              <Text style={[styles.dayNum, active && styles.dayNumActive]}>{d.dayNum}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Time-slot groups */}
      <Text style={styles.sectionLabel}>Pick a time</Text>
      <View style={styles.groups}>
        {SLOT_GROUPS.map((group, i) => (
          <View key={group.title} style={[styles.group, i > 0 && styles.groupSpacing]}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.slots}>
              {group.slots.map((slot) => {
                const active = slot === time;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => onChangeTime(slot)}
                    style={[styles.slot, active && styles.slotActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={slot}>
                    <Clock size={14} color={active ? c.screenBg : c.icon} strokeWidth={1.75} />
                    <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

/** Bucket a selected time label into the DB coarse slot enum. */
export const slotToTimeSlot = (label: string) => toTimeSlot(label);

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: 10,
    fontFamily: font.sansSemi,
    fontSize: t.meta,
    color: c.title,
  },
  // Day picker
  dayRow: {
    paddingVertical: 2,
  },
  dayCell: {
    width: 48,
    height: 56,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sp.md,
  },
  dayCellActive: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  dayLabel: {
    fontFamily: font.sans,
    fontSize: t.chip,
    color: c.meta,
  },
  dayLabelActive: {
    color: c.screenBg,
  },
  dayNum: {
    fontFamily: font.sansSemi,
    fontSize: 17,
    color: c.title,
    marginTop: 4,
  },
  dayNumActive: {
    color: c.screenBg,
  },
  // Time groups
  groups: {},
  group: {},
  groupSpacing: {
    marginTop: 14,
  },
  groupTitle: {
    fontFamily: font.sans,
    fontSize: t.chip,
    color: c.meta,
    letterSpacing: 0.1,
    marginBottom: sp.md,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slot: {
    height: 52,
    paddingHorizontal: sp.lg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.screenBg,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: sp.md,
    marginBottom: sp.md,
  },
  slotActive: {
    borderColor: c.ink,
    backgroundColor: c.ink,
  },
  slotText: {
    fontFamily: font.sans,
    fontSize: t.meta,
    color: c.title,
    marginLeft: sp.md,
  },
  slotTextActive: {
    fontFamily: font.sansSemi,
    color: c.screenBg,
  },
});
