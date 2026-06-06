import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

type SplashProgressBarProps = {
  progress: number;
};

function SplashProgressBar({ progress }: SplashProgressBarProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, progress]);

  const width = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.splash,
    paddingHorizontal: spacing.xl,
  },
  logoBox: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.background.surface,
    marginBottom: spacing.lg,
  },
  logoLetter: {
    color: colors.brand.primary,
    fontSize: 30,
    fontWeight: '600',
  },
  title: {
    color: colors.text.inverse,
    fontSize: 34,
    fontWeight: '500',
    lineHeight: 40,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.brand.splashText,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 48,
  },
  progressTrack: {
    width: 104,
    height: 4,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.brand.splashTrack,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.text.inverse,
  },
});

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.logoBox}>
        <Text style={styles.logoLetter}>E</Text>
      </View>
      <Text style={styles.title}>EdumentX</Text>
      <Text style={styles.subtitle}>Find your perfect tutor nearby</Text>
      <SplashProgressBar progress={100} />
    </View>
  );
}
