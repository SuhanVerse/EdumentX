import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface NextButtonProps {
  onPress: () => void;
  label?: string;
}

const NextButton: React.FC<NextButtonProps> = React.memo(({ onPress, label = 'Next' }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="h-[56px] flex-row items-center justify-center gap-2 rounded-pill bg-ink">
      <Text className="font-semibold text-body text-white">{label}</Text>
      <ArrowRight size={18} color="white" />
    </TouchableOpacity>
  );
});

NextButton.displayName = 'NextButton';

export { NextButton };
