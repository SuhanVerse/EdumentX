import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, sp } from '@/src/theme/visitTokens';

/**
 * Skeleton loading primitives for the visit flow.
 *
 * `Skeleton` is a pulsing container (opacity loop, native driver) — wrap any
 * number of `SkeletonBlock`s in it. `VisitDetailSkeleton` lays out placeholder
 * blocks matching the Visit Details screen so real data never flashes in as
 * dummy text.
 */

export const Skeleton = ({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) => {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
};

interface SkeletonBlockProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonBlock = ({
  width = '100%',
  height = 14,
  radius: r = 8,
  style,
}: SkeletonBlockProps) => (
  <View style={[{ width, height, borderRadius: r, backgroundColor: '#E6E6E1' }, style]} />
);

/** Placeholder layout for the tenant Visit Details screen. */
export const VisitDetailSkeleton = () => (
  <View style={styles.content}>
    <Skeleton>
      {/* Hero image */}
      <SkeletonBlock height={120} radius={radius.card} />

      {/* Title + price + meta */}
      <SkeletonBlock width="62%" height={28} style={styles.line} />
      <SkeletonBlock width="38%" height={16} style={styles.line} />
      <SkeletonBlock width="48%" height={13} style={styles.line} />

      {/* Divider */}
      <SkeletonBlock height={1} style={styles.divider} />

      {/* Date / Time two columns */}
      <View style={styles.row}>
        <SkeletonBlock height={56} radius={radius.control} style={styles.colLeft} />
        <SkeletonBlock height={56} radius={radius.control} style={styles.colRight} />
      </View>

      {/* Status row */}
      <SkeletonBlock width="32%" height={18} style={styles.line} />

      {/* Host row */}
      <View style={styles.hostRow}>
        <SkeletonBlock width={34} height={34} radius={17} />
        <View style={styles.hostBody}>
          <SkeletonBlock width="42%" height={14} />
          <SkeletonBlock width="30%" height={12} style={styles.line} />
        </View>
      </View>

      {/* Actions */}
      <SkeletonBlock height={52} radius={radius.pill} style={styles.btn} />
      <SkeletonBlock height={44} radius={radius.pill} style={styles.btn} />
    </Skeleton>
  </View>
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: sp.lg,
    paddingTop: sp.base,
    paddingBottom: 60,
  },
  line: {
    marginTop: 10,
  },
  divider: {
    marginTop: sp.xl,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginTop: sp.xl,
  },
  colLeft: {
    flex: 1,
    marginRight: sp.base,
  },
  colRight: {
    flex: 1,
    marginLeft: sp.base,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp.xl,
  },
  hostBody: {
    flex: 1,
    marginLeft: sp.base,
  },
  btn: {
    marginTop: sp.xl,
  },
});
