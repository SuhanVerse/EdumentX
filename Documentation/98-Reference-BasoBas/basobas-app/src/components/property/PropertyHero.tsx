import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
import { ArrowLeft, Share2, Heart } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  images?: string[];
  onBack?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onViewAll?: () => void;
  saved?: boolean;
  currentIndex?: number;
};

export const PropertyHero = ({
  images = [],
  onBack,
  onShare,
  onSave,
  onViewAll,
  saved,
  currentIndex = 0,
}: Props) => {
  const hasMultiplePhotos = images.length > 0;

  return (
    <View className="h-[280px] bg-canvas relative">
      {/* Floating buttons */}
      <View className="absolute top-4 left-6 right-6 flex-row justify-between z-10">
        <Pressable
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-pill bg-white/80"
        >
          <ArrowLeft size={18} color="#0A0A0A" strokeWidth={2.2} />
        </Pressable>
        <View className="flex-row">
          {onShare && (
            <Pressable
              onPress={onShare}
              className="mr-2 h-10 w-10 items-center justify-center rounded-pill bg-white/80"
            >
              <Share2 size={18} color="#0A0A0A" />
            </Pressable>
          )}
          {onSave && (
            <Pressable
              onPress={onSave}
              className="h-10 w-10 items-center justify-center rounded-pill bg-white/80"
            >
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
          className="flex-1"
        >
          {images.map((_img, i) => (
            <View key={i} style={{ width: SCREEN_WIDTH }} className="bg-canvas items-center justify-center">
              <Text className="font-sans text-body-sm text-ink3">Photo {i + 1}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-body-sm text-ink3">Property photo</Text>
        </View>
      )}

      {/* Photo counter + View all */}
      <View className="absolute bottom-3 left-6 right-6 flex-row justify-between items-center">
        {hasMultiplePhotos && (
          <View className="rounded-pill bg-black/50 px-3 py-1">
            <Text className="font-medium text-caption text-white">
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
        <Pressable onPress={onViewAll} className="rounded-pill bg-white/80 px-3 py-1 ml-auto">
          <Text className="font-medium text-caption text-ink">View all</Text>
        </Pressable>
      </View>
    </View>
  );
};
