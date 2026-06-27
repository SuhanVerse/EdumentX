import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { ShieldCheck, FileText, CheckCircle2 } from 'lucide-react-native';

export default function VerificationScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Verification Status" showBack={true} centerTitle={true} />
      <ScrollView className="px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        {/* Status Hero Card */}
        <View className="mb-6 items-center rounded-card border border-line bg-bg p-5">
          <ShieldCheck size={48} color="#1A6B4A" />
          <Text className="mt-3 font-semibold text-h2 text-ink">Verified Landlord</Text>
          <Text className="mt-1 text-body-sm text-ink2">Your trust score is excellent (98%)</Text>
        </View>

        {/* Verification Items */}
        <Text className="mb-2 font-semibold text-body-sm text-ink">Verified Documents</Text>
        <View className="mb-6 overflow-hidden rounded-card border border-line bg-bg">
          {[
            { name: 'Citizenship/ID Card', desc: 'Verified on May 12, 2026' },
            { name: 'Land Ownership (Lalpurja)', desc: 'Verified on May 15, 2026' },
            { name: 'Phone Verification', desc: 'Verified on registration' },
          ].map((item, i, arr) => (
            <View
              key={item.name}
              className={`flex-row items-center justify-between p-4 ${i < arr.length - 1 ? 'border-b border-row-divider' : ''}`}>
              <View className="flex-row items-center gap-3">
                <FileText size={20} color="#6B6B6B" />
                <View>
                  <Text className="font-semibold text-body text-ink">{item.name}</Text>
                  <Text className="mt-0.5 text-caption text-ink2">{item.desc}</Text>
                </View>
              </View>
              <CheckCircle2 size={18} color="#1A6B4A" />
            </View>
          ))}
        </View>

        <Text className="text-center text-caption leading-relaxed text-ink2">
          Verification helps you build trust with potential tenants and receive more visit requests.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
