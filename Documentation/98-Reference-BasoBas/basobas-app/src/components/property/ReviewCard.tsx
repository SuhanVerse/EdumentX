import { View, Text } from 'react-native';
import { Star } from 'lucide-react-native';

type Props = {
  name: string;
  rating: number;
  body: string;
  timeAgo?: string;
  avatarInitials?: string;
  className?: string;
};

export const ReviewCard = ({
  name,
  rating,
  body,
  timeAgo,
  avatarInitials = '?',
  className = '',
}: Props) => (
  <View className={`rounded-card border border-line bg-bg p-4 ${className}`}>
    <View className="flex-row items-center mb-2">
      <View className="h-10 w-10 rounded-pill bg-canvas items-center justify-center mr-3">
        <Text className="font-sans text-body-sm text-ink3">{avatarInitials}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-body text-ink">{name}</Text>
        {timeAgo && <Text className="font-sans text-caption text-ink3">{timeAgo}</Text>}
      </View>
      <View className="flex-row items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            color="#F5A623"
            fill={i < rating ? '#F5A623' : 'transparent'}
          />
        ))}
      </View>
    </View>
    <Text className="font-sans text-body-sm text-ink2 leading-relaxed">{body}</Text>
  </View>
);
