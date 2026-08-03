import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';

const { color } = tokens;

const NOTE_MAX = 200;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScheduleSelection {
  date: Date;
  time: string;
  /** Optional message to the landlord. */
  note?: string;
}

export interface ScheduleVisitDrawerProps {
  propertyTitle: string;
  propertyLocation: string;
  initialDate?: Date;
  availableTimeSlots?: string[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: ScheduleSelection) => Promise<void> | void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const DEFAULT_TIME_SLOTS = ['9:00 AM', '10:30 AM', '11:30 AM', '1:00 PM', '2:00 PM', '4:30 PM'];

// ─── Month Grid Calculator ───────────────────────────────────────────────────

interface MonthGridDay {
  day: number | null; // null = padding cell
  date: Date | null;
}

function buildMonthGrid(year: number, month: number): MonthGridDay[] {
  // First day of month (0=Sun … 6=Sat) → convert to Monday-based (0=Mon … 6=Sun)
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: MonthGridDay[] = [];

  for (let i = 0; i < startOffset; i++) {
    grid.push({ day: null, date: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ day: d, date: new Date(year, month, d) });
  }
  return grid;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ScheduleVisitDrawer = ({
  propertyTitle,
  propertyLocation,
  initialDate,
  availableTimeSlots = DEFAULT_TIME_SLOTS,
  isOpen,
  onClose,
  onConfirm,
}: ScheduleVisitDrawerProps) => {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(initialDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate?.getMonth() ?? today.getMonth());

  // Auto-select the first available date: initialDate or today
  const initialDay = initialDate?.getDate() ?? today.getDate();
  const [selectedDay, setSelectedDay] = useState<number | null>(
    isPastDate(new Date(viewYear, viewMonth, initialDay)) ? null : initialDay
  );
  const [selectedTime, setSelectedTime] = useState(availableTimeSlots[0] ?? '');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [note, setNote] = useState('');
  const [confirmState, setConfirmState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // ── Open/close sync ──────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.expand();
      // Reset state on open
      setSelectedTime(availableTimeSlots[0] ?? '');
      setShowTimePicker(false);
      setNote('');
      setConfirmState('idle');
    } else {
      sheetRef.current?.close();
    }
  }, [isOpen, availableTimeSlots]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDay(null);
    setShowTimePicker(false);
    setConfirmState('idle');
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDay(null);
    setShowTimePicker(false);
    setConfirmState('idle');
  }, []);

  const handleDayPress = useCallback((day: number, date: Date) => {
    if (isPastDate(date)) return;
    setSelectedDay(day);
    setConfirmState('idle');
  }, []);

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time);
    setShowTimePicker(false);
    setConfirmState('idle');
  }, []);

  const handleConfirm = useCallback(async () => {
    if (selectedDay == null || !selectedTime) return;
    const date = new Date(viewYear, viewMonth, selectedDay);
    setConfirmState('loading');
    try {
      await onConfirm({ date, time: selectedTime, note: note.trim() || undefined });
      setConfirmState('success');
      // Auto-close after showing success feedback
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setConfirmState('error');
    }
  }, [selectedDay, selectedTime, viewYear, viewMonth, note, onConfirm, onClose]);

  const selectedDateObj = selectedDay != null ? new Date(viewYear, viewMonth, selectedDay) : null;

  // ── Bottom sheet index ───────────────────────────────────────────────────

  const snapPoints = useMemo(() => ['65%'], []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={sheetStyles.background}
      handleIndicatorStyle={sheetStyles.handle}
      onChange={(idx) => {
        if (idx === -1 && isOpen) onClose();
      }}>
      <BottomSheetScrollView
        contentContainerStyle={[sheetStyles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ── Heading ──────────────────────────────────────────────────── */}
        <Text className="px-6 font-display text-h1 leading-tight text-ink">Schedule a Visit</Text>
        <Text className="mt-1 px-6 font-sans text-body text-ink2">
          {propertyTitle} · {propertyLocation}
        </Text>

        {/* ── Calendar Card ────────────────────────────────────────────── */}
        <View className="mx-6 mt-4 rounded-card bg-canvas p-4">
          {/* Header row */}
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-bold text-body text-ink">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={goToPrevMonth}
                className="h-9 w-9 items-center justify-center rounded-pill"
                accessibilityLabel="Previous month"
                accessibilityRole="button">
                <ChevronLeft size={18} color={color.ink} />
              </Pressable>
              <Pressable
                onPress={goToNextMonth}
                className="h-9 w-9 items-center justify-center rounded-pill"
                accessibilityLabel="Next month"
                accessibilityRole="button">
                <ChevronRight size={18} color={color.ink} />
              </Pressable>
            </View>
          </View>

          {/* Weekday row */}
          <View className="mb-2 flex-row">
            {WEEKDAYS.map((day, i) => (
              <View key={`${day}-${i}`} className="flex-1 items-center py-1">
                <Text className="font-sans text-caption text-ink3">{day}</Text>
              </View>
            ))}
          </View>

          {/* Date grid */}
          <View className="flex-row flex-wrap">
            {grid.map((cell, i) => {
              if (cell.day == null) {
                return (
                  <View
                    key={`pad-${i}`}
                    className="aspect-square flex-1 basis-[14.28%] items-center justify-center"
                  />
                );
              }
              const cellDate = cell.date!;
              const past = isPastDate(cellDate);
              const selected = cell.day === selectedDay;
              const todayMarker = isToday(cellDate);

              return (
                <Pressable
                  key={`day-${cell.day}`}
                  onPress={() => handleDayPress(cell.day!, cellDate)}
                  disabled={past}
                  className="basis-[14.28%] items-center justify-center py-0.5"
                  accessibilityLabel={`${cell.day} ${MONTH_NAMES[viewMonth]} ${viewYear}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: past }}>
                  <View
                    className={`aspect-square h-10 w-10 items-center justify-center rounded-pill ${
                      selected ? 'bg-ink' : past ? 'bg-transparent' : 'bg-transparent'
                    }`}>
                    <Text
                      className={`font-semibold text-body-sm ${
                        selected ? 'text-white' : past ? 'text-placeholder' : 'text-ink'
                      }`}>
                      {cell.day}
                    </Text>
                    {todayMarker && !selected && (
                      <View className="absolute bottom-0.5 h-1 w-1 rounded-pill bg-brand" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Time Slot ────────────────────────────────────────────────── */}
        <Text className="mt-5 px-6 font-semibold text-h3 text-ink">Time Slot</Text>

        <View className="mx-6 mt-2">
          {/* Time selector row */}
          <Pressable
            onPress={() => setShowTimePicker((v) => !v)}
            className="flex-row items-center rounded-card bg-canvas px-4 py-3.5"
            accessibilityLabel={`Selected time: ${selectedTime}. Tap to change.`}
            accessibilityRole="button">
            <Clock size={18} color={color.ink2} />
            <Text className="ml-3 flex-1 font-sans text-body text-ink">{selectedTime}</Text>
            <ChevronRight
              size={18}
              color={color.ink2}
              style={{
                transform: [{ rotate: showTimePicker ? '90deg' : '0deg' }],
              }}
            />
          </Pressable>

          {/* Expanded time options */}
          {showTimePicker && (
            <View className="mt-2 overflow-hidden rounded-card border border-line bg-bg">
              {availableTimeSlots.map((time, i) => {
                const active = time === selectedTime;
                return (
                  <Pressable
                    key={time}
                    onPress={() => handleTimeSelect(time)}
                    className={`flex-row items-center justify-between px-4 py-3.5 ${
                      i < availableTimeSlots.length - 1 ? 'border-b border-line' : ''
                    } ${active ? 'bg-brand-light' : 'bg-bg'}`}
                    accessibilityLabel={`${time}${active ? ', selected' : ''}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}>
                    <Text
                      className={`font-sans text-body ${
                        active ? 'font-semibold text-brand' : 'text-ink'
                      }`}>
                      {time}
                    </Text>
                    {active && (
                      <View className="h-6 w-6 items-center justify-center rounded-pill bg-brand">
                        <Check size={14} color={color.bg} strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Note (optional) ─────────────────────────────────────────── */}
        <Text className="mt-5 px-6 font-semibold text-h3 text-ink">Message</Text>

        <View className="mx-6 mt-2 rounded-card border border-line bg-bg p-4">
          <TextInput
            style={sheetStyles.noteInput}
            placeholder="Add a note for the landlord (optional)"
            placeholderTextColor={color.placeholder}
            multiline
            maxLength={NOTE_MAX}
            value={note}
            onChangeText={setNote}
            textAlignVertical="top"
          />
          <Text style={sheetStyles.noteCounter}>
            {note.length}/{NOTE_MAX}
          </Text>
        </View>

        {/* ── Confirm Button ───────────────────────────────────────────── */}
        <View className="mx-6 mt-6">
          {confirmState === 'success' ? (
            <View className="flex-row items-center justify-center rounded-pill bg-brand-light py-4">
              <Check size={18} color={color.brand} strokeWidth={3} />
              <Text className="ml-2 font-semibold text-body text-brand">Visit Requested!</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleConfirm}
              disabled={confirmState === 'loading' || selectedDay == null || !selectedTime}
              className={`h-[56px] items-center justify-center rounded-pill ${
                selectedDay != null && selectedTime ? 'bg-ink' : 'bg-placeholder'
              }`}
              accessibilityRole="button"
              accessibilityLabel={
                selectedDateObj
                  ? `Confirm Visit for ${formatDateLong(selectedDateObj)}`
                  : 'Select a date to confirm'
              }
              accessibilityState={{ disabled: selectedDay == null }}>
              <Text className="font-semibold text-body text-white">
                {confirmState === 'loading'
                  ? 'Confirming…'
                  : selectedDateObj
                    ? `Confirm Visit for ${formatDateLong(selectedDateObj)}`
                    : 'Select a Date'}
              </Text>
            </Pressable>
          )}

          {confirmState === 'error' && (
            <Text className="mt-2 text-center font-sans text-body-sm text-danger">
              Something went wrong. Please try again.
            </Text>
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// ─── Styles (for gorhom sheet background/handle which can't use Tailwind) ─────

const sheetStyles = StyleSheet.create({
  background: {
    backgroundColor: color.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handle: {
    backgroundColor: color.line,
    width: 40,
    borderRadius: 999,
  },
  scrollContent: {
    paddingTop: 8,
  },
  noteInput: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#0A0A0A',
    lineHeight: 20,
    minHeight: 72,
  },
  noteCounter: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'right',
    marginTop: 4,
  },
});
