import { View, Text, Pressable } from 'react-native';
import { ArrowLeft, Settings } from 'lucide-react-native';
import { router, useSegments } from 'expo-router';

type Props = {
  title: string;
  showBack?: boolean;
  centerTitle?: boolean;
  rightIcon?: 'settings' | null;
  rightText?: { label: string; onPress?: () => void };
};

export const ScreenHeader = ({ title, showBack, centerTitle, rightIcon, rightText }: Props) => {
  const segments = useSegments();
  const inLandlord = segments[0] === '(landlord)';

  return (
    <View className="h-[56px] flex-row items-center justify-between border-b border-line bg-bg px-6">
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-pill bg-input">
          <ArrowLeft size={18} color="#0A0A0A" strokeWidth={2.2} />
        </Pressable>
      ) : (
        <Text className="font-display text-[22px] text-ink">{title}</Text>
      )}

      {showBack && centerTitle && (
        <Text className="font-semibold text-[17px] text-ink">{title}</Text>
      )}

      {rightIcon === 'settings' ? (
        <Pressable
          onPress={() =>
            router.push(
              inLandlord ? ('/(landlord)/settings' as any) : ('/(tenant)/settings' as any)
            )
          }
          className="h-10 w-10 items-center justify-center rounded-pill bg-input">
          <Settings size={18} color="#0A0A0A" />
        </Pressable>
      ) : rightText ? (
        <Pressable onPress={rightText.onPress}>
          <Text className="font-semibold text-[15px] text-brand">{rightText.label}</Text>
        </Pressable>
      ) : (
        <View className="w-11" />
      )}
    </View>
  );
};
