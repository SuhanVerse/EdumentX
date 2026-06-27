import React from 'react';
import { Pressable, Text } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface NextButtonProps {
  onPress: () => void;
  label?: string;
}

const NextButton: React.FC<NextButtonProps> = React.memo(({ onPress, label = 'Next' }) => {
  return (
    <Pressable
      onPress={onPress}
      className="h-[56px] flex-row items-center justify-center gap-2 rounded-pill bg-ink"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Text className="font-semibold text-body text-white">{label}</Text>
      <ArrowRight size={18} color="white" />
    </Pressable>
  );
});

NextButton.displayName = 'NextButton';

export { NextButton };
