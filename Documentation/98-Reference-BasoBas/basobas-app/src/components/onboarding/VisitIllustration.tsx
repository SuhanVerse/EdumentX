import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarDays, Check, Home } from 'lucide-react-native';

const VisitIllustration: React.FC = () => (
  <View className="flex-1 items-center justify-center bg-canvas px-5">
    <View className="relative w-full">
      {/* ── Main booking card ───────────────────────────────────── */}
      <View className="overflow-hidden rounded-card bg-bg" style={styles.cardShadow}>
        {/* Property mini-header */}
        <View className="flex-row items-center gap-3 border-b border-line px-3 py-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-md bg-canvas">
            <Home size={15} color="#0A0A0A" strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-body-sm text-ink">Jhamsikhel Flat</Text>
            <Text className="text-caption text-ink2">2BHK · Lalitpur</Text>
          </View>
        </View>

        {/* Booking section */}
        <View className="px-3 pb-4 pt-3">
          {/* Date row */}
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-semibold text-body text-ink">Fri, May 30</Text>
            <View className="flex-row items-center gap-1">
              <CalendarDays size={14} color="#6B6B6B" />
              <Text className="text-caption text-ink3">2025</Text>
            </View>
          </View>

          {/* Slot 1 — SELECTED */}
          <View className="mb-2 flex-row items-center justify-between rounded-lg bg-ink px-3 py-2.5">
            <View className="flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full bg-brand" />
              <Text className="font-semibold text-body-sm text-white">10:00 AM</Text>
            </View>
            <Check size={15} color="white" />
          </View>

          {/* Slot 2 */}
          <View className="mb-2 rounded-lg bg-canvas px-3 py-2.5">
            <Text className="text-body-sm text-ink2">01:30 PM</Text>
          </View>

          {/* Slot 3 */}
          <View className="rounded-lg bg-canvas px-3 py-2.5">
            <Text className="text-body-sm text-ink2">04:00 PM</Text>
          </View>
        </View>
      </View>

      {/* ── Confirmed chip — overlaps card bottom-right ─────────── */}
      <View
        className="absolute flex-row items-center gap-1.5 rounded-pill bg-brand px-3 py-2"
        style={[styles.chipShadow, { bottom: -14, right: 0 }]}>
        {/* Landlord avatar */}
        <View className="h-5 w-5 items-center justify-center rounded-full bg-white/25">
          <Text style={{ fontSize: 9, color: 'white', fontWeight: '700' }}>R</Text>
        </View>
        <Check size={13} color="white" />
        <Text className="font-semibold text-caption text-white">Confirmed</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  chipShadow: {
    shadowColor: '#1A6B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
});

VisitIllustration.displayName = 'VisitIllustration';
export { VisitIllustration };
