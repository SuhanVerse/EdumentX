import { Pressable, Text, View } from 'react-native';

type ChipVariant = 'pill' | 'rounded';
type ChipColor = 'default' | 'brand' | 'active';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: ChipVariant;
  color?: ChipColor;
  icon?: React.ReactNode;
};

const BG_MAP = {
  'default': 'bg-canvas',
  'brand': 'bg-brand',
  'active': 'bg-ink',
};

const TEXT_MAP = {
  'default': 'text-ink',
  'brand': 'text-white',
  'active': 'text-white',
};

export const FilterChip = ({
  label,
  selected,
  onPress,
  variant = 'pill',
  color,
  icon,
}: Props) => {
  const resolvedColor = color || (selected ? 'active' : 'default');

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center ${
        variant === 'pill' ? 'rounded-pill' : 'rounded-lg'
      } ${BG_MAP[resolvedColor]} px-4 py-2 mr-2 mb-2`}
    >
      {icon && <View className="mr-1.5">{icon}</View>}
      <Text className={`font-medium text-body-sm ${TEXT_MAP[resolvedColor]}`}>
        {label}
      </Text>
    </Pressable>
  );
};
