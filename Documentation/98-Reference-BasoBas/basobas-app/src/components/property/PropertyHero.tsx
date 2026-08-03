import { View, Text, Image, Pressable, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Heart } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  images?: string[];
  onBack?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onViewAll?: () => void;
  onIndexChange?: (index: number) => void;
  saved?: boolean;
  currentIndex?: number;
  /** Override the default hero height (default 280). */
  height?: number;
};

export const PropertyHero = ({
  images = [],
  onBack,
  onShare,
  onSave,
  onViewAll,
  onIndexChange,
  saved,
  currentIndex = 0,
  height = 280,
}: Props) => {
  const insets = useSafeAreaInsets();
  const hasMultiplePhotos = images.length > 0;

  return (
    <View style={{ height }} className="relative bg-canvas">
      {/* Floating buttons */}
      <View style={{ top: insets.top + 8 }} className="absolute left-6 right-6 z-10 flex-row justify-between">
        <Pressable
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-pill bg-white/80">
          <ArrowLeft size={18} color="#0A0A0A" strokeWidth={2.2} />
        </Pressable>
        <View className="flex-row">
          {onShare && (
            <Pressable
              onPress={onShare}
              className="mr-2 h-10 w-10 items-center justify-center rounded-pill bg-white/80">
              <Share2 size={18} color="#0A0A0A" />
            </Pressable>
          )}
          {onSave && (
            <Pressable
              onPress={onSave}
              className="h-10 w-10 items-center justify-center rounded-pill bg-white/80">
              <Heart
                size={18}
                color={saved ? '#E53E3E' : '#0A0A0A'}
                fill={saved ? '#E53E3E' : 'transparent'}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Image carousel area */}
      {hasMultiplePhotos ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            onIndexChange?.(page);
          }}
          className="flex-1">
          {images.map((img, i) => (
            <View
              key={i}
              style={{ width: SCREEN_WIDTH }}
              className="bg-canvas">
              <Image
                source={{ uri: img }}
                style={{ width: SCREEN_WIDTH, height }}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-body-sm text-ink3">Property photo</Text>
        </View>
      )}

      {/* Photo counter + View all */}
      <View className={`absolute bottom-3 left-6 right-6 flex-row items-center ${onViewAll ? 'justify-between' : 'justify-end'}`}>
        {hasMultiplePhotos && (
          <View className="rounded-pill bg-black/50 px-3 py-1">
            <Text className="font-medium text-caption text-white">
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
        {onViewAll && (
          <Pressable onPress={onViewAll} className="ml-auto rounded-pill bg-white/80 px-3 py-1">
            <Text className="font-medium text-caption text-ink">View all</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};
