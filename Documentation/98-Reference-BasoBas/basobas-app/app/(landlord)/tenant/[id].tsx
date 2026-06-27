import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { ShieldCheck, Star } from 'lucide-react-native';

export default function TenantProfileScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Tenant Profile" showBack={true} centerTitle={true} />

      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {/* Identity block */}
        <View className="mb-6 items-center">
          <View className="relative mb-3 h-[96px] w-[96px] items-center justify-center rounded-pill bg-canvas">
            <Text className="font-sans text-h1 text-ink3">T</Text>
            <View className="absolute bottom-0 right-0 rounded-full border-2 border-bg bg-brand p-1.5">
              <ShieldCheck size={16} color="#FFFFFF" />
            </View>
          </View>
          <Text className="font-semibold text-h2 text-ink">Aayush Shrestha</Text>
          <Text className="mt-0.5 text-body-sm text-ink2">Verified Tenant</Text>
        </View>

        {/* Stats Grid */}
        <View className="mb-6 flex-row gap-3">
          {[
            { label: 'Completed Visits', value: '12' },
            { label: 'Rating received', value: '4.9★' },
            { label: 'Member Since', value: '2024' },
          ].map((stat) => (
            <View
              key={stat.label}
              className="flex-1 items-center rounded-card border border-line bg-bg p-3">
              <Text className="font-semibold text-body text-ink">{stat.value}</Text>
              <Text className="mt-1 text-center text-[10px] text-ink2">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Trust Indicators */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Trust Indicators</Text>
        <View className="mb-6 rounded-card border border-line bg-bg p-4">
          {[
            'KYC verification successfully completed',
            'Phone number verified (+977 980-XXXXXXX)',
            'No reports or policy violations',
          ].map((indicator, i) => (
            <View key={i} className="mb-2 flex-row items-center gap-2">
              <ShieldCheck size={14} color="#1A6B4A" />
              <Text className="text-body-sm text-ink2">{indicator}</Text>
            </View>
          ))}
        </View>

        {/* Reviews from other landlords */}
        <Text className="mb-3 font-semibold text-h3 text-ink">Reviews from Landlords</Text>
        <View className="rounded-card border border-line bg-bg p-4">
          <View className="mb-4 border-b border-row-divider pb-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="font-semibold text-body-sm text-ink">Ram Prasad</Text>
              <View className="flex-row items-center gap-1">
                <Star size={12} color="#F5A623" fill="#F5A623" />
                <Text className="font-semibold text-caption text-ink">5.0</Text>
              </View>
            </View>
            <Text className="text-body-sm italic text-ink2">
              {'"Punctual, polite, and kept the premises exceptionally clean."'}
            </Text>
          </View>
          <View>
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="font-semibold text-body-sm text-ink">Sita Devi</Text>
              <View className="flex-row items-center gap-1">
                <Star size={12} color="#F5A623" fill="#F5A623" />
                <Text className="font-semibold text-caption text-ink">4.8</Text>
              </View>
            </View>
            <Text className="text-body-sm italic text-ink2">
              {'"Highly recommended tenant. Communication was smooth throughout."'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
