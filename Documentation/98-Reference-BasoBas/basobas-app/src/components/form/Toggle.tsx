import { Pressable, View, Text } from 'react-native';

type Props = {
  value: boolean;
  onToggle: () => void;
  label?: string;
};

export const Toggle = ({ value, onToggle, label }: Props) => (
  <Pressable onPress={onToggle} className="flex-row items-center">
    {label && <Text className="mr-2 font-medium text-body text-ink">{label}</Text>}
    <View
      className={`h-7 w-12 justify-center rounded-pill p-0.5 ${
        value ? 'items-end bg-brand' : 'items-start bg-line'
      }`}>
      <View className="h-6 w-6 rounded-pill bg-white shadow-sm" />
    </View>
  </Pressable>
);
