import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  type AlertButton,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@clerk/expo';
import { ArrowLeft, MapPin, MoreVertical, Eye, Inbox, ImageIcon } from 'lucide-react-native';

import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getMyProperties, relistProperty, deleteProperty } from '@/src/services/properties.service';
import {
  formatMonthlyPrice,
  type LandlordPropertySummary,
  type PropertyStatusUi,
} from '@/src/types/property.types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MyPropertiesScreenProps {
  onBack?: () => void;
  onPropertyPress?: (property: LandlordPropertySummary) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TABS = ['All', 'Active', 'Draft', 'Archived'] as const;
type FilterTab = (typeof TABS)[number];

const STATUS_STYLES: Record<PropertyStatusUi, { container: string; text: string; label: string }> =
  {
    active: {
      container: 'bg-emerald-100/90',
      text: 'text-emerald-800',
      label: 'Active',
    },
    draft: {
      container: 'bg-amber-100/90',
      text: 'text-amber-800',
      label: 'Draft',
    },
    paused: {
      container: 'bg-gray-100/90',
      text: 'text-gray-500',
      label: 'Paused',
    },
    archived: {
      container: 'bg-gray-100/90',
      text: 'text-gray-500',
      label: 'Archived',
    },
  };

const FORMATTER = new Intl.NumberFormat('en-IN');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * `Active` covers both live and occupied listings — `paused` (OCCUPIED) has no
 * tab of its own, so it sits alongside active rather than disappearing.
 */
function matchesFilter(property: LandlordPropertySummary, tab: FilterTab): boolean {
  switch (tab) {
    case 'All':
      return true;
    case 'Active':
      return property.statusUi === 'active' || property.statusUi === 'paused';
    case 'Draft':
      return property.statusUi === 'draft';
    case 'Archived':
      return property.statusUi === 'archived';
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PropertyStatusUi }) {
  const cfg = STATUS_STYLES[status];
  return (
    <View className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 ${cfg.container}`}>
      <Text className={`font-semibold text-xs ${cfg.text}`}>{cfg.label}</Text>
    </View>
  );
}

function PropertyCard({
  item,
  onPress,
  onActionsPress,
}: {
  item: LandlordPropertySummary;
  onPress: () => void;
  onActionsPress: () => void;
}) {
  const cover = item.photoUrls[0];

  return (
    <Pressable
      onPress={onPress}
      className="mb-4 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${formatMonthlyPrice(item.price)}`}>
      <View className="relative h-44 w-full bg-canvas">
        {cover ? (
          <Image source={{ uri: cover }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <ImageIcon size={28} color="#AAAAAA" strokeWidth={1.5} />
          </View>
        )}
        <StatusBadge status={item.statusUi} />
        <TouchableOpacity
          onPress={onActionsPress}
          className="absolute right-3 top-3 z-10 h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm"
          activeOpacity={0.7}
          accessibilityLabel="Property actions">
          <MoreVertical size={16} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <View className="gap-1 p-4">
        <Text className="font-bold text-base text-gray-900" numberOfLines={1}>
          {item.title}
        </Text>

        <View className="flex-row items-center gap-1">
          <MapPin size={12} color="#707070" />
          <Text className="flex-1 font-medium text-xs text-gray-500" numberOfLines={1}>
            {item.locationArea}
          </Text>
        </View>

        <Text className="my-1 font-bold text-sm text-emerald-800">
          {formatMonthlyPrice(item.price)}
        </Text>

        <View className="mt-2 flex-row items-center gap-4 border-t border-gray-100 pt-3">
          <View className="flex-row items-center gap-1">
            <Eye size={13} color="#9CA3AF" />
            <Text className="font-semibold text-xs text-gray-900">
              {FORMATTER.format(item.views)}
            </Text>
            <Text className="text-xs text-gray-400">views</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Inbox size={13} color="#9CA3AF" />
            <Text className="font-semibold text-xs text-gray-900">
              {FORMATTER.format(item.requests)}
            </Text>
            <Text className="text-xs text-gray-400">requests</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function MyPropertiesScreen({ onBack, onPropertyPress }: MyPropertiesScreenProps) {
  const router = useRouter();
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;

  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [properties, setProperties] = useState<LandlordPropertySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!clerkId) return;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);

      const result = await getMyProperties(clerkId, supabase);

      if (result.success) {
        setProperties(result.data);
        setErrorMessage(null);
      } else {
        setErrorMessage(result.error);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [clerkId, supabase]
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // Publishing a listing routes back here, so refresh whenever the tab regains
  // focus rather than showing the pre-publish snapshot.
  useFocusEffect(
    useCallback(() => {
      load('refresh');
    }, [load])
  );

  const filtered = useMemo(
    () => properties.filter((p) => matchesFilter(p, activeTab)),
    [properties, activeTab]
  );

  const count = (tab: FilterTab) => properties.filter((p) => matchesFilter(p, tab)).length;

  const handleRelist = useCallback(
    async (property: LandlordPropertySummary) => {
      const result = await relistProperty(property.id, supabase);
      if (!result.success) {
        Alert.alert('Could not relist', result.error);
        return;
      }
      load('refresh');
    },
    [supabase, load]
  );

  const handleDelete = useCallback(
    (property: LandlordPropertySummary) => {
      Alert.alert(
        'Delete listing?',
        `"${property.title}" will be removed from search. Visit history is kept.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const result = await deleteProperty(property.id, supabase);
              if (!result.success) {
                Alert.alert('Could not delete', result.error);
                return;
              }
              load('refresh');
            },
          },
        ]
      );
    },
    [supabase, load]
  );

  const handleActions = useCallback(
    (property: LandlordPropertySummary) => {
      const options: AlertButton[] = [
        {
          text: 'Edit listing',
          onPress: () =>
            router.push({
              pathname: '/(landlord)/listing/[id]',
              params: { id: property.id },
            } as any),
        },
      ];

      // Relist only makes sense for an occupied listing.
      if (property.status === 'OCCUPIED') {
        options.push({
          text: 'Relist as available',
          onPress: () => handleRelist(property),
        });
      }

      if (!property.isDeleted) {
        options.push({
          text: 'Delete listing',
          style: 'destructive',
          onPress: () => handleDelete(property),
        });
      }

      options.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert(property.title, undefined, options);
    },
    [router, handleRelist, handleDelete]
  );

  return (
    <View className="flex-1 bg-white pt-14">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />
        }>
        <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <TouchableOpacity
            onPress={() => (onBack ? onBack() : router.back())}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
            activeOpacity={0.6}
            accessibilityLabel="Go back">
            <ArrowLeft size={20} color="#1a1a1a" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text className="font-bold text-lg text-gray-900">My Properties</Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row border-b border-gray-100 px-4 py-3">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`mr-2 flex-row items-center gap-1.5 rounded-full px-4 py-2 ${
                  isActive ? 'bg-black' : 'bg-gray-100'
                }`}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}>
                <Text
                  className={`text-xs ${
                    isActive ? 'font-semibold text-white' : 'font-medium text-gray-600'
                  }`}>
                  {tab}
                </Text>
                <View
                  className={`min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                  <Text
                    className={`font-semibold text-[10px] ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`}>
                    {count(tab)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View className="gap-3 px-4 pb-8 pt-4">
          {loading ? (
            <View className="items-center pt-16">
              <ActivityIndicator color="#1A6B4A" />
            </View>
          ) : errorMessage ? (
            <View className="items-center px-8 pt-16">
              <Text className="mb-1.5 font-semibold text-base text-gray-900">
                Could not load your properties
              </Text>
              <Text className="mb-4 text-center font-medium text-sm leading-5 text-gray-500">
                {errorMessage}
              </Text>
              <TouchableOpacity
                onPress={() => load('initial')}
                className="h-[42px] items-center justify-center rounded-full bg-black px-6"
                activeOpacity={0.8}>
                <Text className="font-semibold text-sm text-white">Try again</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View className="items-center px-8 pt-16">
              <Text className="mb-1.5 font-semibold text-base text-gray-900">
                No {activeTab.toLowerCase()} properties
              </Text>
              <Text className="text-center font-medium text-sm leading-5 text-gray-500">
                {activeTab === 'Active'
                  ? 'Create a new listing to get started'
                  : activeTab === 'Draft'
                    ? 'Save a listing as draft to see it here'
                    : 'No archived properties yet'}
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <PropertyCard
                key={item.id}
                item={item}
                onActionsPress={() => handleActions(item)}
                onPress={() =>
                  onPropertyPress
                    ? onPropertyPress(item)
                    : router.push({
                        pathname: '/(landlord)/listing/[id]',
                        params: { id: item.id },
                      } as any)
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
