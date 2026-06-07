import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Text, YStack } from 'tamagui';

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
    <YStack
      width={104}
      height={4}
      overflow="hidden"
      borderRadius={999}
      backgroundColor={colors.brand.splashTrack}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 999,
          backgroundColor: colors.text.inverse,
          width,
        }}
      />
    </YStack>
  );
}

export function SplashScreen() {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor={colors.brand.splash}
      paddingHorizontal={spacing.xl}
    >
      <StatusBar style="light" />
      <YStack
        width={64}
        height={64}
        alignItems="center"
        justifyContent="center"
        borderRadius={16}
        backgroundColor={colors.background.surface}
        marginBottom={spacing.lg}
      >
        <Text color={colors.brand.primary} fontSize={30} fontWeight="600">
          E
        </Text>
      </YStack>
      <Text
        color={colors.text.inverse}
        fontSize={34}
        fontWeight="500"
        lineHeight={40}
        marginBottom={spacing.sm}
      >
        EdumentX
      </Text>
      <Text
        color={colors.brand.splashText}
        fontSize={16}
        lineHeight={22}
        marginBottom={48}
      >
        Find your perfect tutor nearby
      </Text>
      <SplashProgressBar progress={100} />
    </YStack>
  );
}
