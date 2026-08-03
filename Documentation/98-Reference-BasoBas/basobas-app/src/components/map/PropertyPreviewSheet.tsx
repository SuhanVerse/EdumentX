import { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { MapPin, ArrowRight } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';
import { formatMonthlyPrice } from '@/src/types/property.types';
import type { PropertyPin } from '@/src/types/map.types';
import { PROPERTY_STATUS_COLORS } from '@/src/types/map.types';

const { color } = tokens;

interface PropertyPreviewSheetProps {
  property: PropertyPin | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PropertyPreviewSheet = ({
  property,
  isOpen,
  onClose,
}: PropertyPreviewSheetProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['30%'], []);

  useEffect(() => {
    if (isOpen && property) {
      sheetRef.current?.expand();
    } else if (!isOpen) {
      sheetRef.current?.close();
    }
  }, [isOpen, property]);

  const handleViewDetails = useCallback(() => {
    if (!property) return;
    onClose();
    router.push({
      pathname: '/(tenant)/property/[id]' as any,
      params: { id: property.id },
    });
  }, [property, router, onClose]);

  if (!property) return null;

  const statusColor = PROPERTY_STATUS_COLORS[property.status] ?? '#9CA3AF';

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={sheetStyles.background}
      handleIndicatorStyle={sheetStyles.handle}
      onChange={(idx) => {
        if (idx === -1 && isOpen) onClose();
      }}>
      <BottomSheetScrollView
        contentContainerStyle={[
          sheetStyles.scrollContent,
          { paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-start gap-4 px-6">
          <View
            className="h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: color.input }}>
            <Text className="font-sans text-caption text-placeholder">Photo</Text>
          </View>

          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="font-semibold text-body-sm text-ink">
              {property.title}
            </Text>

            <View className="mt-1 flex-row items-center gap-1.5">
              <View
                className="h-2 w-2 rounded-pill"
                style={{ backgroundColor: statusColor }}
              />
              <Text className="font-medium text-caption text-ink2">
                {property.status === 'AVAILABLE' ? 'Available' :
                 property.status === 'HIGH_DEMAND' ? 'High Demand' :
                 property.status === 'UNDER_DISCUSSION' ? 'Under Discussion' :
                 'Occupied'}
              </Text>
            </View>

            <Text className="mt-1 font-bold text-body-sm text-brand">
              {formatMonthlyPrice(property.price)}
            </Text>

            <View className="mt-1 flex-row items-center gap-1">
              <MapPin size={11} color={color.ink2} />
              <Text numberOfLines={1} className="font-sans text-caption text-ink2">
                {property.locationArea}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleViewDetails}
          accessibilityRole="button"
          accessibilityLabel="View property details"
          className="mx-6 mt-4 h-[52px] flex-row items-center justify-center gap-2 rounded-pill bg-ink">
          <Text className="font-semibold text-body text-white">View Details</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const sheetStyles = StyleSheet.create({
  background: {
    backgroundColor: color.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handle: {
    backgroundColor: color.line,
    width: 40,
    borderRadius: 999,
  },
  scrollContent: {
    paddingTop: 8,
  },
});
