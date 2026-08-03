import React from 'react';
import { Pressable, Text } from 'react-native';

interface SkipButtonProps {
  onPress: () => void;
}

const SkipButton: React.FC<SkipButtonProps> = React.memo(({ onPress }) => {
  return (
    <Pressable onPress={onPress}>
      <Text className="font-medium text-body-sm text-ink2">Skip</Text>
    </Pressable>
  );
});

SkipButton.displayName = 'SkipButton';

export { SkipButton };
