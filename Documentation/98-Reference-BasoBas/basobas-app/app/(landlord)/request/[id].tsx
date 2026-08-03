import { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Calendar, Clock, MapPin, User, CheckCircle, ChevronRight } from 'lucide-react-native';

import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getVisitRequest } from '@/src/services/visits.service';
import {
  formatVisitDate,
  TIME_SLOT_LABELS,
  type LandlordVisitRequest,
} from '@/src/types/property.types';

export default function RequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supabase = useClerkSupabase();

  const [request, setRequest] = useState<LandlordVisitRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!id) return;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);

      const result = await getVisitRequest(id, supabase);

      if (result.success) {
        setRequest(result.data);
        setErrorMessage(result.data ? null : 'This request no longer exists.');
      } else {
        setErrorMessage(result.error);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [id, supabase],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // The action screens mutate this request and navigate back, so re-read on
  // focus instead of showing the pre-action state.
  useFocusEffect(
    useCallback(() => {
      load('refresh');
    }, [load]),
  );

  const isAccepted = request ? request.statusUi === 'accepted' : false;
  const canAct = request?.status === 'PENDING';

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-bg">
        <ScreenHeader title="Request Detail" showBack={true} centerTitle={true} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1A6B4A" />
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-bg">
        <ScreenHeader title="Request Detail" showBack={true} centerTitle={true} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-1.5 font-semibold text-body text-ink">
            Could not load this request
          </Text>
          <Text className="mb-5 text-center text-body-sm text-ink2">
            {errorMessage ?? 'Please try again.'}
          </Text>
          <Pressable
            onPress={() => load('initial')}
            className="h-[48px] items-center justify-center rounded-pill bg-black px-8">
            <Text className="font-semibold text-body text-white">Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScreenHeader title="Request Detail" showBack={true} centerTitle={true} />

      <ScrollView
        className="px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />
        }>
        {/* Tenant Profile Preview Card */}
        <Text className="mb-2 font-semibold text-body-sm text-ink">Requesting Tenant</Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(landlord)/tenant/[id]',
              params: { id: request.tenantId },
            } as any)
          }
          className="mb-5 flex-row items-center justify-between rounded-card border border-line bg-bg p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-pill bg-canvas">
              <User size={20} color="#AAAAAA" />
            </View>
            <View>
              <Text className="font-semibold text-body text-ink">
                {request.tenantName ?? 'Tenant'}
              </Text>
              <Text className="text-caption text-ink2">{request.statusLabel}</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#0A0A0A" />
        </Pressable>

        {/* Requested Date & Time */}
        <Text className="mb-2 font-semibold text-body-sm text-ink">Requested Time Slot</Text>
        <View className="mb-5 rounded-card border border-line bg-bg p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <Calendar size={16} color="#1A6B4A" />
            <Text className="font-medium text-body text-ink">
              {formatVisitDate(request.requestedDate)}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Clock size={16} color="#1A6B4A" />
            <Text className="font-medium text-body text-ink">
              {TIME_SLOT_LABELS[request.timeSlot]}
            </Text>
          </View>
        </View>

        {/* Property Summary */}
        <Text className="mb-2 font-semibold text-body-sm text-ink">Property</Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(landlord)/listing/[id]',
              params: { id: request.propertyId },
            } as any)
          }
          className="mb-5 rounded-card border border-line bg-bg p-4">
          <Text className="font-semibold text-body text-ink">
            {request.propertyTitle ?? 'Your listing'}
          </Text>
          {request.propertyArea ? (
            <View className="mt-1 flex-row items-center gap-1">
              <MapPin size={12} color="#6B6B6B" />
              <Text className="text-caption text-ink2">{request.propertyArea}</Text>
            </View>
          ) : null}
        </Pressable>

        {/* Note — only when the tenant left one */}
        {request.note ? (
          <>
            <Text className="mb-2 font-semibold text-body-sm text-ink">{"Tenant's Note"}</Text>
            <View className="mb-5 rounded-card border border-line bg-canvas p-4">
              <Text className="text-body-sm leading-relaxed text-ink2">{request.note}</Text>
            </View>
          </>
        ) : null}

        {/* Your earlier response, if any */}
        {request.landlordResponseNote ? (
          <>
            <Text className="mb-2 font-semibold text-body-sm text-ink">Your Response</Text>
            <View className="mb-5 rounded-card border border-line bg-canvas p-4">
              <Text className="text-body-sm leading-relaxed text-ink2">
                {request.landlordResponseNote}
              </Text>
            </View>
          </>
        ) : null}

        {/* Suggest Time — pending only, and the RPC caps this at 3 */}
        {canAct && request.rescheduleCount < 3 && (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(landlord)/suggest-time',
                params: { id: request.id },
              } as any)
            }
            className="items-center py-2">
            <Text className="font-semibold text-body-sm text-brand">Suggest a different time</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Sticky Bottom Actions */}
      {canAct ? (
        <View className="absolute inset-x-6 bottom-6 flex-row gap-3">
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(landlord)/decline-request',
                params: { id: request.id },
              } as any)
            }
            className="h-[56px] flex-1 items-center justify-center rounded-pill border border-line bg-bg">
            <Text className="font-semibold text-body text-ink2">Decline</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(landlord)/share-details',
                params: { id: request.id },
              } as any)
            }
            className="h-[56px] flex-[2] items-center justify-center rounded-pill bg-black">
            <Text className="font-semibold text-body text-white">Approve Request</Text>
          </Pressable>
        </View>
      ) : (
        <View className="absolute inset-x-6 bottom-6">
          <View
            className={`h-[56px] flex-row items-center justify-center gap-2 rounded-pill ${
              isAccepted ? 'bg-brand-light' : 'bg-canvas'
            }`}>
            {isAccepted ? <CheckCircle size={18} color="#1A6B4A" strokeWidth={2} /> : null}
            <Text
              className={`font-semibold text-body ${isAccepted ? 'text-brand' : 'text-ink2'}`}>
              {request.statusLabel}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
