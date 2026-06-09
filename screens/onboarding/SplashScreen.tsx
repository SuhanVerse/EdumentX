import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';

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
    <View className="w-splash-bar h-1 overflow-hidden rounded-pill bg-splash-track">
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 999,
          backgroundColor: colors.text.inverse,
          width,
        }}
      />
    </View>
  );
}

export function SplashScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-splash px-5">
      <StatusBar style="light" />
      <View className="w-16 h-16 items-center justify-center rounded-2xl bg-surface mb-4">
        <Text className="text-text-primary text-splash-mark">E</Text>
      </View>
      <Text className="text-white text-splash-wordmark mb-2">
        EdumentX
      </Text>
      <Text className="text-splash-text text-tagline mb-12">
        Find your perfect tutor nearby
      </Text>
      <SplashProgressBar progress={100} />
    </SafeAreaView>
  );
}
