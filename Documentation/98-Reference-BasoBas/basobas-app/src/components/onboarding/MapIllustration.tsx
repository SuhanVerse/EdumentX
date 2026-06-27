import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle, MapPin, Search } from 'lucide-react-native';

const MapIllustration: React.FC = () => (
  <View className="flex-1 gap-2 bg-canvas px-4 py-3">
    {/* ── Search bar ──────────────────────────────────────────── */}
    <View
      className="flex-row items-center gap-2 rounded-pill bg-bg px-3 py-2"
      style={styles.searchShadow}>
      <Search size={13} color="#AAAAAA" />
      <Text className="flex-1 text-body-sm text-ink2">Kathmandu, Nepal</Text>
      <View className="h-5 w-5 items-center justify-center rounded-full bg-brand">
        <Search size={9} color="white" />
      </View>
    </View>

    {/* ── Tile grid ───────────────────────────────────────────── */}
    <View className="flex-1 gap-2">
      {/* Row 1 */}
      <View className="flex-row gap-2" style={{ flex: 1 }}>
        {/* Tile A — highlighted area (Thamel selected) */}
        <View className="relative flex-1 overflow-hidden rounded-lg" style={styles.tileShadow}>
          <View className="absolute inset-0 bg-brand-light" />
          {/* Area border */}
          <View className="absolute inset-0 rounded-lg border border-brand opacity-40" />
          {/* Area label */}
          <View className="absolute left-2 top-2 rounded bg-brand px-1.5 py-0.5">
            <Text style={{ fontSize: 9, color: 'white', fontWeight: '700' }}>Thamel</Text>
          </View>
          {/* Pin */}
          <MapPin
            style={{ position: 'absolute', top: '48%', left: '38%' }}
            size={18}
            color="#1A6B4A"
          />
          {/* Price bubble */}
          <View className="absolute bottom-2 left-2 flex-row items-center gap-0.5 rounded-pill bg-ink px-2 py-1">
            <Text style={{ fontSize: 10, color: 'white', fontWeight: '700' }}>28k</Text>
            <CheckCircle size={9} color="white" />
          </View>
        </View>

        {/* Tile B */}
        <View className="relative flex-1 rounded-lg bg-bg" style={styles.tileShadow}>
          <MapPin
            style={{ position: 'absolute', top: '30%', left: '36%' }}
            size={18}
            color="#AAAAAA"
          />
          <View className="absolute right-2 top-2 rounded bg-canvas px-1.5 py-0.5">
            <Text style={{ fontSize: 9, color: '#6B6B6B', fontWeight: '600' }}>42k</Text>
          </View>
        </View>
      </View>

      {/* Row 2 */}
      <View className="flex-row gap-2" style={{ flex: 1 }}>
        {/* Tile C */}
        <View className="relative flex-1 rounded-lg bg-bg" style={styles.tileShadow}>
          <MapPin
            style={{ position: 'absolute', top: '35%', left: '40%' }}
            size={18}
            color="#AAAAAA"
          />
          <View className="absolute bottom-2 right-2 flex-row items-center gap-0.5 rounded-pill bg-ink px-2 py-1">
            <Text style={{ fontSize: 10, color: 'white', fontWeight: '700' }}>35k</Text>
          </View>
        </View>

        {/* Tile D */}
        <View className="relative flex-1 rounded-lg bg-bg" style={styles.tileShadow}>
          <MapPin
            style={{ position: 'absolute', top: '28%', left: '38%' }}
            size={17}
            color="#AAAAAA"
          />
          <MapPin
            style={{ position: 'absolute', top: '55%', left: '55%' }}
            size={14}
            color="#C0C0C0"
          />
        </View>
      </View>
    </View>

    {/* ── Bottom status bar ───────────────────────────────────── */}
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-1.5">
        <View className="h-2 w-2 rounded-full bg-brand" />
        <Text className="font-medium text-caption text-ink2">12 properties</Text>
      </View>
      <Text className="text-caption text-ink3">Updated just now</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  searchShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tileShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
});

MapIllustration.displayName = 'MapIllustration';
export { MapIllustration };
