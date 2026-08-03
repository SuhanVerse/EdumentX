import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { Crosshair, Navigation } from 'lucide-react-native';

// TODO: replace placeholder background + projection math with <MapView /> from
// react-native-maps once map integration lands. The public prop contract below
// is intentionally minimal so this swap stays local to this file.

export interface RadiusMapViewProps {
  /** Display label for the search center, e.g. "Kathmandu, Nepal". */
  centerLabel: string;
  /** Optional real coordinate — accepted now so the API stays stable. */
  centerCoordinate?: { latitude: number; longitude: number };
  /** Radius in kilometers — drives the on-screen circle size. */
  radiusKm: number;
  /** Recenter button — re-center on user's current device location. */
  onRecenter?: () => void;
}

// ─── Projection Helper ───────────────────────────────────────────────────────
//
// `getRadiusCircleSizeForKm` is intentionally simple today (px-per-km linear
// approximation). When a real map SDK is wired in, only this function and
// the underlying <MapView> need to change — the rest of the screen is
// insulated from the projection details.

/**
 * Approximate on-screen pixel diameter for a radius at the current zoom level.
 * Calibrated for the placeholder view's 390-wide canvas; the real map SDK
 * will compute this from lat/lng + zoom level.
 */
export const getRadiusCircleSizeForKm = (radiusKm: number): number => {
  // Linear approximation — capped to keep the circle inside the map bounds.
  const PX_PER_KM = 56;
  return Math.min(280, Math.max(48, radiusKm * PX_PER_KM));
};

// ─── Constants ───────────────────────────────────────────────────────────────

const RING_COLORS = {
  ring1: 'rgba(59, 130, 246, 0.12)',
  ring2: 'rgba(59, 130, 246, 0.20)',
  fill: 'rgba(59, 130, 246, 0.18)',
  stroke: 'rgba(59, 130, 246, 0.85)',
};

// ─── Component ───────────────────────────────────────────────────────────────

export const RadiusMapView = ({
  centerLabel,
  radiusKm,
  onRecenter,
}: RadiusMapViewProps) => {
  // Schematic "road" strokes — purely decorative. Real map will draw actual
  // geometry. These positions look right against the 390-wide canvas.
  const roadPaths = useMemo(
    () => [
      // Wide diagonal road (bottom-left → top-right)
      'M -20 220 L 120 160 L 220 200 L 320 120 L 420 150',
      // Horizontal main road
      'M -20 140 L 90 150 L 180 130 L 270 160 L 360 140 L 420 155',
      // Vertical-ish road through the right side
      'M 290 -10 L 280 80 L 300 160 L 285 240 L 310 320',
      // Curved side road
      'M 60 -10 Q 100 80 70 180 Q 50 240 90 320',
      // Faint cross road
      'M 130 -10 L 145 100 L 130 220 L 150 320',
    ],
    [],
  );

  const circleSize = getRadiusCircleSizeForKm(radiusKm);

  return (
    <View className="relative flex-1 overflow-hidden bg-[#E4E8E0]">
      {/* ── Schematic map background (placeholder for <MapView />) ───── */}
      <Svg
        className="absolute inset-0"
        viewBox="0 0 390 320"
        preserveAspectRatio="xMidYMid slice">
        <Defs>
          {/* Soft radial vignette so the center marker reads */}
          <RadialGradient id="vignette" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.20" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.06" />
          </RadialGradient>
        </Defs>

        {/* Subtle base tone slightly warmer than the canvas color */}
        <Rect x={0} y={0} width={390} height={320} fill="#E4E8E0" />

        {/* Schematic road network */}
        <G stroke="#C8CFC4" strokeWidth={14} strokeLinecap="round" fill="none" opacity={0.55}>
          {roadPaths.map((d, i) => (
            <Path key={`road-${i}`} d={d} />
          ))}
        </G>
        <G stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeDasharray="6 8" fill="none" opacity={0.7}>
          {roadPaths.map((d, i) => (
            <Path key={`road-dashed-${i}`} d={d} />
          ))}
        </G>

        {/* A few "block" hints for visual texture */}
        <Rect x={40} y={40} width={36} height={28} fill="#D4DAD0" rx={4} opacity={0.6} />
        <Rect x={210} y={50} width={50} height={36} fill="#D4DAD0" rx={4} opacity={0.6} />
        <Rect x={170} y={230} width={44} height={28} fill="#D4DAD0" rx={4} opacity={0.6} />
        <Rect x={330} y={210} width={42} height={34} fill="#D4DAD0" rx={4} opacity={0.6} />

        {/* Center vignette overlay */}
        <Rect x={0} y={0} width={390} height={320} fill="url(#vignette)" />
      </Svg>

      {/* ── Radius circle (the only on-map geometry besides the marker) ── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: circleSize,
          height: circleSize,
          marginLeft: -circleSize / 2,
          marginTop: -circleSize / 2,
          borderRadius: circleSize / 2,
          borderWidth: 2,
          borderColor: RING_COLORS.stroke,
          backgroundColor: RING_COLORS.fill,
        }}
      />

      {/* ── Center marker — glowing blue dot with white ring ──────────── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginLeft: -16,
          marginTop: -16,
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 6,
          elevation: 4,
        }}>
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: '#3B82F6',
            borderWidth: 3,
            borderColor: '#FFFFFF',
          }}
        />
      </View>

      {/* ── Floating location-label chip over the marker ──────────────── */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginLeft: -70,
          marginTop: -48,
          width: 140,
        }}>
        <View className="flex-row items-center gap-1.5 self-center rounded-pill bg-ink/85 px-2.5 py-1">
          <Crosshair size={12} color="#FFFFFF" />
          <Text numberOfLines={1} className="font-medium text-caption text-white">
            {centerLabel}
          </Text>
        </View>
      </View>

      {/* ── Recenter FAB ──────────────────────────────────────────────── */}
      <Pressable
        onPress={onRecenter}
        accessibilityRole="button"
        accessibilityLabel="Recenter on my location"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 6,
        }}>
        <Navigation size={18} color="#1F2937" />
      </Pressable>
    </View>
  );
};

RadiusMapView.displayName = 'RadiusMapView';
