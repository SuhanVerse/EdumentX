import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

type Props = {
  label: string;
  subtitle?: string;
  /** Optional Tailwind class override for the subtitle (e.g. to color it green
   *  when a feature is active). Defaults to `text-ink2` when omitted. */
  subtitleClassName?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  showChevron?: boolean;
  tall?: boolean;
  className?: string;
  isLast?: boolean;
};

export const MenuRow = ({
  label,
  subtitle,
  subtitleClassName = 'text-ink2',
  onPress,
  icon,
  rightSlot,
  showChevron = true,
  tall,
  className = '',
  isLast,
}: Props) => (
  <Pressable
    onPress={onPress}
    className={`flex-row items-center px-4 ${tall ? 'h-16' : 'h-[52px]'} ${!isLast ? 'border-b border-row-divider' : ''} ${className}`}>
    {icon && <View className="mr-3">{icon}</View>}
    <View className="flex-1">
      <Text className="font-medium text-body text-ink">{label}</Text>
      {subtitle && (
        <Text className={`mt-0.5 font-sans text-caption ${subtitleClassName}`}>{subtitle}</Text>
      )}
    </View>
    {rightSlot || (showChevron && <ChevronRight size={18} color="#AAAAAA" />)}
  </Pressable>
);
