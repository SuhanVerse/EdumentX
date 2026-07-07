import { View, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';

type MapPinData = {
  count?: number;
  price?: string;
  color?: string;
  isSelected?: boolean;
};

export const PropertyMapPin = ({ count, price, color = '#1A6B4A', isSelected }: MapPinData) => {
  if (count && count > 1) {
    // Cluster pin
    return (
      <View className="items-center justify-center">
        <View
          className="flex-row items-center rounded-pill px-3 py-1.5"
          style={{
            backgroundColor: isSelected ? '#0A0A0A' : color,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}>
          <MapPin size={14} color="#FFFFFF" />
          <Text className="ml-1 font-bold text-caption text-white">{count}</Text>
        </View>
        <View
          className="-mt-0.5 h-2 w-2 rounded-sm"
          style={{
            backgroundColor: isSelected ? '#0A0A0A' : color,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    );
  }

  // Single property pin
  return (
    <View className="items-center justify-center">
      <View
        className="rounded-pill px-3 py-1.5"
        style={{
          backgroundColor: isSelected ? '#0A0A0A' : '#FFFFFF',
          borderWidth: 2,
          borderColor: isSelected ? '#0A0A0A' : color,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        }}>
        <Text className="font-bold text-caption" style={{ color: isSelected ? '#FFFFFF' : color }}>
          {price || 'NPR'}
        </Text>
      </View>
      <View
        className="-mt-0.5 h-2 w-2 rounded-sm"
        style={{
          backgroundColor: isSelected ? '#0A0A0A' : '#FFFFFF',
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderColor: isSelected ? '#0A0A0A' : color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
};
