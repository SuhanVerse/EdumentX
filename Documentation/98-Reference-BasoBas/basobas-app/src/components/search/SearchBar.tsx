import { View, TextInput, Pressable } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';

type Props = {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFilterPress?: () => void;
  onPress?: () => void;
  editable?: boolean;
  showFilterIcon?: boolean;
};

export const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search properties...',
  autoFocus,
  onFilterPress,
  onPress,
  editable = true,
  showFilterIcon,
}: Props) => {
  const content = (
    <View className="flex-1 flex-row items-center">
      <Search size={18} color="#AAAAAA" />
      {editable ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 font-sans text-body text-ink ml-2"
          placeholderTextColor="#C0C0C0"
        />
      ) : (
        <Pressable onPress={onPress} className="flex-1 ml-2">
          <View pointerEvents="none">
            <TextInput
              placeholder={placeholder}
              editable={false}
              className="font-sans text-body text-placeholder"
              placeholderTextColor="#C0C0C0"
            />
          </View>
        </Pressable>
      )}
    </View>
  );

  return (
    <View className="h-[48px] flex-row items-center rounded-lg bg-input px-4">
      {content}
      {showFilterIcon && onFilterPress && (
        <Pressable onPress={onFilterPress} className="ml-2 h-8 w-8 items-center justify-center">
          <SlidersHorizontal size={18} color="#6B6B6B" />
        </Pressable>
      )}
    </View>
  );
};
