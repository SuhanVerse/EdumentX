import { Image, View, Text, Pressable } from 'react-native';
import { Pencil } from 'lucide-react-native';

type Props = {
  size?: number;
  initials?: string;
  uri?: string;
  showEditBadge?: boolean;
  onEditPress?: () => void;
  className?: string;
};

export const Avatar = ({
  size = 80,
  initials = '?',
  uri,
  showEditBadge,
  onEditPress,
  className = '',
}: Props) => (
  <View className={`items-center ${className}`}>
    <View
      className="relative items-center justify-center rounded-pill bg-canvas"
      style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          className="rounded-pill"
        />
      ) : (
        <Text className="font-sans text-ink3" style={{ fontSize: size * 0.35 }}>
          {initials}
        </Text>
      )}

      {showEditBadge && (
        <Pressable
          onPress={onEditPress}
          className="absolute -bottom-0.5 -right-0.5 h-7 w-7 items-center justify-center rounded-pill border-2 border-bg bg-brand">
          <Pencil size={12} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  </View>
);
