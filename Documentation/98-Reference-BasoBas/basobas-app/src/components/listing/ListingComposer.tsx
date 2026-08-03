import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../layout/ScreenHeader';

type Props = {
  title: string;
  subtitle: string;
  step: number;
  totalSteps?: number;
  children: React.ReactNode;
  onContinue?: () => void;
  continueLabel?: string;
  isLastStep?: boolean;
  disableContinue?: boolean;
};

export const ListingComposer = ({
  title,
  subtitle,
  step,
  totalSteps = 4,
  children,
  onContinue,
  continueLabel = 'Continue',
  isLastStep,
  disableContinue,
}: Props) => {
  const progress = (step / totalSteps) * 100;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="New Listing" showBack centerTitle />

      {/* Progress Bar */}
      <View className="h-1 w-full bg-line">
        <View className="h-full bg-brand" style={{ width: `${progress}%` }} />
      </View>

      {/* Step label */}
      <View className="px-6 pb-1 pt-5">
        <Text className="mb-1 font-semibold text-h2 text-ink">{title}</Text>
        <Text className="font-sans text-body text-ink2">{subtitle}</Text>
      </View>

      <View className="flex-1 px-6">{children}</View>

      {/* Sticky bottom CTA */}
      <View className="border-t border-line bg-bg px-6 pb-6 pt-3">
        <Pressable
          onPress={onContinue}
          disabled={disableContinue}
          className={`h-[56px] items-center justify-center rounded-pill ${
            disableContinue ? 'bg-line' : 'bg-brand'
          }`}>
          <Text className="font-semibold text-body text-white">{continueLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
