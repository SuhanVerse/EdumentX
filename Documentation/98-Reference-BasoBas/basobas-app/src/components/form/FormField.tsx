import { View, Text, TextInput, Pressable } from 'react-native';

type Props = {
  label: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  maxLength?: number;
  disabled?: boolean;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  footer?: React.ReactNode;
  error?: string;
};

export const FormField = ({
  label,
  placeholder,
  value,
  onChangeText,
  multiline,
  numberOfLines,
  keyboardType,
  maxLength,
  disabled,
  rightIcon,
  onRightIconPress,
  footer,
  error,
}: Props) => (
  <View className="mb-4">
    <Text className="mb-1.5 font-medium text-body-sm text-ink2">{label}</Text>
    <View
      className={`flex-row items-center rounded-lg ${
        disabled ? 'bg-input-readonly' : 'bg-input'
      } px-4 ${multiline ? 'pb-2 pt-3' : 'h-[56px]'} ${error ? 'border border-danger' : ''}`}>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={!disabled}
        className={`flex-1 font-sans text-body text-ink ${multiline ? 'min-h-[80px]' : ''}`}
        placeholderTextColor="#C0C0C0"
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {rightIcon && (
        <Pressable onPress={onRightIconPress} className="ml-2">
          {rightIcon}
        </Pressable>
      )}
    </View>
    {error && <Text className="mt-1 font-sans text-caption text-danger">{error}</Text>}
    {footer && <View className="mt-1">{footer}</View>}
  </View>
);
