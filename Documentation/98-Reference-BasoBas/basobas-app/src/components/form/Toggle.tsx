import { Pressable, View, Text } from 'react-native';

type Props = {
  value: boolean;
  onToggle: () => void;
  label?: string;
};

export const Toggle = ({ value, onToggle, label }: Props) => (
  <Pressable onPress={onToggle} className="flex-row items-center">
    {label && <Text className="font-medium text-body text-ink mr-2">{label}</Text>}
    <View
      className={`h-7 w-12 rounded-pill p-0.5 justify-center ${
        value ? 'bg-brand items-end' : 'bg-line items-start'
      }`}
    >
      <View className="h-6 w-6 rounded-pill bg-white shadow-sm" />
    </View>
  </Pressable>
);
