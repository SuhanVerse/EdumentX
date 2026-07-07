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

const STATUS_BADGES: Record<
  NonNullable<StatusOverlay>,
  { bg: string; text: string; label: string }
> = {
  active: { bg: 'bg-brand', text: 'text-white', label: 'Active' },
  paused: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Paused' },
  draft: { bg: 'bg-line', text: 'text-ink2', label: 'Draft' },
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
        className="mr-3 w-[200px] overflow-hidden rounded-card border border-line bg-bg">
        <View className="h-[100px] items-center justify-center bg-canvas">
          <Text className="font-sans text-caption text-ink3">{imagePlaceholder}</Text>
        </View>
        <View className="p-3">
          <Text numberOfLines={1} className="font-semibold text-body-sm text-ink">
            {title}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 font-sans text-caption text-ink2">
            {location}
          </Text>
          <Text className="mt-1 font-bold text-body-sm text-brand">{price}</Text>
        </View>
      </Pressable>
    );
  }

  if (variant === 'grid') {
    return (
      <Pressable
        onPress={onPress}
        className="mb-4 w-[48%] overflow-hidden rounded-card border border-line bg-bg">
        <View className="relative h-28 items-center justify-center bg-canvas">
          {statusOverlay && (
            <View
              className={`absolute left-2 top-2 rounded-pill px-2 py-0.5 ${STATUS_BADGES[statusOverlay].bg}`}>
              <Text className={`font-semibold text-caption ${STATUS_BADGES[statusOverlay].text}`}>
                {STATUS_BADGES[statusOverlay].label}
              </Text>
            </View>
          )}
          <Text className="font-sans text-caption text-ink3">{imagePlaceholder}</Text>
        </View>
        <View className="p-3">
          <Text numberOfLines={1} className="font-semibold text-body-sm text-ink">
            {title}
          </Text>
          <Text className="mt-0.5 font-sans text-caption text-ink2">{price}</Text>
          {rating && (
            <View className="mt-1.5 flex-row items-center">
              <Star size={12} color="#F5A623" fill="#F5A623" />
              <Text className="ml-1 font-medium text-caption text-ink">{rating}</Text>
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
      className="mb-4 overflow-hidden rounded-card border border-line bg-bg">
      <View className="relative h-[160px] items-center justify-center bg-canvas">
        <Text className="font-sans text-body-sm text-ink3">{imagePlaceholder}</Text>
        {onSave && (
          <Pressable
            onPress={onSave}
            className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-pill bg-white/80">
            <Heart
              size={18}
              color={saved ? '#E53E3E' : '#0A0A0A'}
              fill={saved ? '#E53E3E' : 'transparent'}
            />
          </Pressable>
        )}
      </View>
      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <Text className="mr-2 flex-1 font-semibold text-body text-ink">{title}</Text>
          {rating && (
            <View className="flex-row items-center">
              <Star size={14} color="#F5A623" fill="#F5A623" />
              <Text className="ml-1 font-medium text-body-sm text-ink">{rating}</Text>
            </View>
          )}
        </View>
        <Text className="mt-0.5 font-sans text-body-sm text-ink2">{location}</Text>
        <Text className="mt-2 font-bold text-body text-brand">{price}</Text>
      </View>
    </Pressable>
  );
};
