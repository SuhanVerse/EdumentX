import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';

export default function MapScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Map" showBack centerTitle />
      <View className="flex-1 items-center justify-center bg-canvas">
        <Text className="font-sans text-body text-ink2">MapView placeholder</Text>
        <Text className="font-sans text-body-sm text-ink3 mt-1">
          react-native-maps will render here
        </Text>
      </View>
    </SafeAreaView>
  );
}
