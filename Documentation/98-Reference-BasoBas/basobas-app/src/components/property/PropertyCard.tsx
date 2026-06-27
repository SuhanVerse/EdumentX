import { View, Text, Pressable } from 'react-native';
import { Star, Heart } from 'lucide-react-native';

type PropertyCardVariant = 'compact-h' | 'grid' | 'wide';
type StatusOverlay = 'active' | 'paused' | 'draft' | null;

type Props = {
  title: string;
  location: string;
  price: string;
  rating?: string;
  imagePlaceholder?: string;
  variant: PropertyCardVariant;
  statusOverlay?: StatusOverlay;
  onPress?: () => void;
  onSave?: () => void;
  saved?: boolean;
};

const STATUS_BADGES: Record<NonNullable<StatusOverlay>, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-brand', text: 'text-white', label: 'Active' },
  paused: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Paused' },
  draft:  { bg: 'bg-line', text: 'text-ink2', label: 'Draft' },
};

export const PropertyCard = ({
  title,
  location,
  price,
  rating,
  imagePlaceholder = 'Photo',
  variant,
  statusOverlay,
  onPress,
  onSave,
  saved,
}: Props) => {
  if (variant === 'compact-h') {
    return (
      <Pressable
        onPress={onPress}
        className="mr-3 w-[200px] rounded-card border border-line bg-bg overflow-hidden"
      >
        <View className="h-[100px] bg-canvas items-center justify-center">
          <Text className="font-sans text-caption text-ink3">{imagePlaceholder}</Text>
        </View>
        <View className="p-3">
          <Text numberOfLines={1} className="font-semibold text-body-sm text-ink">{title}</Text>
          <Text numberOfLines={1} className="font-sans text-caption text-ink2 mt-0.5">{location}</Text>
          <Text className="font-bold text-body-sm text-brand mt-1">{price}</Text>
        </View>
      </Pressable>
    );
  }

  if (variant === 'grid') {
    return (
      <Pressable
        onPress={onPress}
        className="w-[48%] mb-4 rounded-card border border-line bg-bg overflow-hidden"
      >
        <View className="h-28 bg-canvas items-center justify-center relative">
          {statusOverlay && (
            <View className={`absolute top-2 left-2 rounded-pill px-2 py-0.5 ${STATUS_BADGES[statusOverlay].bg}`}>
              <Text className={`font-semibold text-caption ${STATUS_BADGES[statusOverlay].text}`}>
                {STATUS_BADGES[statusOverlay].label}
              </Text>
            </View>
          )}
          <Text className="font-sans text-caption text-ink3">{imagePlaceholder}</Text>
        </View>
        <View className="p-3">
          <Text numberOfLines={1} className="font-semibold text-body-sm text-ink">{title}</Text>
          <Text className="font-sans text-caption text-ink2 mt-0.5">{price}</Text>
          {rating && (
            <View className="flex-row items-center mt-1.5">
              <Star size={12} color="#F5A623" fill="#F5A623" />
              <Text className="font-medium text-caption text-ink ml-1">{rating}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  // 'wide' variant
  return (
    <Pressable
      onPress={onPress}
      className="mb-4 rounded-card border border-line bg-bg overflow-hidden"
    >
      <View className="h-[160px] bg-canvas items-center justify-center relative">
        <Text className="font-sans text-body-sm text-ink3">{imagePlaceholder}</Text>
        {onSave && (
          <Pressable
            onPress={onSave}
            className="absolute top-3 right-3 h-9 w-9 rounded-pill bg-white/80 items-center justify-center"
          >
            <Heart size={18} color={saved ? '#E53E3E' : '#0A0A0A'} fill={saved ? '#E53E3E' : 'transparent'} />
          </Pressable>
        )}
      </View>
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-body text-ink flex-1 mr-2">{title}</Text>
          {rating && (
            <View className="flex-row items-center">
              <Star size={14} color="#F5A623" fill="#F5A623" />
              <Text className="font-medium text-body-sm text-ink ml-1">{rating}</Text>
            </View>
          )}
        </View>
        <Text className="font-sans text-body-sm text-ink2 mt-0.5">{location}</Text>
        <Text className="font-bold text-body text-brand mt-2">{price}</Text>
      </View>
    </Pressable>
  );
};
