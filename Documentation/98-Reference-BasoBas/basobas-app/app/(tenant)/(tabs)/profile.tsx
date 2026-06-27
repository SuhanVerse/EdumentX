import { View, Text } from 'react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { ScreenHeader } from '@/src/components/layout/ScreenHeader';

export default function ProfileTab() {
  return (
    <ScreenBody>
      <ScreenHeader title="Profile" rightIcon="settings" />

      {/* Avatar */}
      <View className="mb-5 mt-4 items-center px-6">
        <View className="mb-3 h-[80px] w-[80px] items-center justify-center rounded-pill bg-canvas">
          <Text className="font-sans text-h1 text-ink3">U</Text>
        </View>
        <Text className="font-semibold text-h3 text-ink">User Name</Text>
        <Text className="font-sans text-body-sm text-ink2">+977 98XXXXXXXX</Text>
      </View>

      {/* Menu sections placeholder */}
      <View className="mx-6 rounded-card border border-line bg-bg">
        {['Edit Profile', 'Saved Properties', 'My Reviews', 'Rental Preferences', 'KYC Upload'].map(
          (item, i, arr) => (
            <View
              key={item}
              className={`px-4 py-4 ${i < arr.length - 1 ? 'border-b border-row-divider' : ''}`}>
              <Text className="font-medium text-body text-ink">{item}</Text>
            </View>
          )
        )}
      </View>
    </ScreenBody>
  );
}
