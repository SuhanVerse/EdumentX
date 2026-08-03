import { Pressable, Text, ActivityIndicator } from 'react-native';
import { Search } from 'lucide-react-native';

interface SearchThisAreaButtonProps {
  visible: boolean;
  loading: boolean;
  onPress: () => void;
}

export const SearchThisAreaButton = ({
  visible,
  loading,
  onPress,
}: SearchThisAreaButtonProps) => {
  if (!visible) return null;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Search this area"
      className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 flex-row items-center gap-2 rounded-pill bg-ink px-5 py-3"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      }}>
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Search size={16} color="#FFFFFF" />
      )}
      <Text className="font-semibold text-body-sm text-white">
        {loading ? 'Searching…' : 'Search This Area'}
      </Text>
    </Pressable>
  );
};
