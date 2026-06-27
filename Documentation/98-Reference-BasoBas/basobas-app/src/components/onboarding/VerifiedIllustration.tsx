import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, MapPin, Star } from 'lucide-react-native';

const VerifiedIllustration: React.FC = () => (
  <View className="flex-1 items-center justify-center bg-canvas px-5">
    <View className="relative w-full">
      {/* ── Back card (depth layer) ─────────────────────────────── */}
      <View
        className="absolute rounded-card bg-bg"
        style={[styles.backCard, styles.cardShadowSoft]}
      />

      {/* ── Front card ──────────────────────────────────────────── */}
      <View className="overflow-hidden rounded-card bg-bg" style={styles.cardShadow}>
        {/* Property "photo" — code-drawn building silhouette */}
        <View className="relative h-24 overflow-hidden bg-ink">
          {/* Window grid: 3 columns × 2 rows */}
          <View className="absolute inset-0 flex-row items-center justify-evenly px-4">
            {([0.35, 0.2, 0.4] as number[]).map((op, col) => (
              <View key={col} className="gap-2">
                <View
                  style={{
                    width: 16,
                    height: 11,
                    borderRadius: 3,
                    backgroundColor: `rgba(255,255,255,${op})`,
                  }}
                />
                <View
                  style={{
                    width: 16,
                    height: 11,
                    borderRadius: 3,
                    backgroundColor: `rgba(255,255,255,${op + 0.1})`,
                  }}
                />
              </View>
            ))}
          </View>

          {/* Subtle brand gradient stripe at bottom of photo */}
          <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand opacity-60" />

          {/* VERIFIED badge — top right of photo */}
          <View className="absolute right-2 top-2 flex-row items-center gap-1 rounded-pill bg-brand px-2 py-1">
            <BadgeCheck size={10} color="white" />
            <Text className="font-bold text-[9px] tracking-wider text-white">VERIFIED</Text>
          </View>
        </View>

        {/* Details */}
        <View className="p-3">
          <View className="flex-row items-start justify-between">
            <View className="mr-2 flex-1">
              <Text className="font-semibold text-body text-ink">Oakridge Studio</Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <MapPin size={11} color="#6B6B6B" />
                <Text className="text-caption text-ink2">Lalitpur · 1BHK</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="font-bold text-[14px] text-ink">45K</Text>
              <Text className="text-caption text-ink3">NPR/mo</Text>
            </View>
          </View>

          {/* Star rating */}
          <View className="mt-2 flex-row items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={10} color="#F5A623" fill="#F5A623" />
            ))}
            <Text className="ml-1 font-medium text-caption text-ink2">4.9</Text>
            <Text className="text-caption text-ink3"> · 24 reviews</Text>
          </View>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  backCard: {
    top: -10,
    left: 10,
    right: -8,
    height: '106%',
    zIndex: -1,
  },
  cardShadowSoft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.11,
    shadowRadius: 20,
    elevation: 5,
  },
});

VerifiedIllustration.displayName = 'VerifiedIllustration';
export { VerifiedIllustration };
