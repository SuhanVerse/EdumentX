import { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Share,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Share as ShareIcon,
  User,
  CheckCircle,
  Star,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getPublishedPropertiesByLandlord } from '@/src/services/properties.service';
import { getLandlordVerificationDetail, type LandlordVerificationStatus } from '@/src/services/properties.service';
import type { PropertyPublic } from '@/src/types/property.types';

const { color, space, radius, font, size } = tokens;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtNpr = (n: number) => `NPR ${n.toLocaleString('en-US')}`;

const yearOf = (iso: string | null): string => (iso ? new Date(iso).getFullYear().toString() : '');

const verificationLabel = (status: LandlordVerificationStatus | null): string => {
  switch (status) {
    case 'VERIFIED':
      return 'Identity Verified';
    case 'UNDER_REVIEW':
      return 'Verification in Review';
    case 'REJECTED':
      return 'Verification Rejected';
    default:
      return 'Identity Not Verified';
  }
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PublicLandlordProfileScreen() {
  const router = useRouter();
  const supabase = useClerkSupabase();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [verification, setVerification] = useState<LandlordVerificationStatus | null>(null);
  const [listings, setListings] = useState<PropertyPublic[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const [profileRes, ratingRes, verifyRes, listingsRes] = await Promise.all([
      supabase.from('profiles').select('full_name, avatar_url, created_at').eq('clerk_id', id).maybeSingle(),
      supabase
        .from('landlord_profiles')
        .select('avg_rating, total_reviews')
        .eq('clerk_id', id)
        .maybeSingle(),
      getLandlordVerificationDetail(id, supabase),
      getPublishedPropertiesByLandlord(id, supabase),
    ]);

    if (profileRes.error) {
      setError(profileRes.error.message);
      setLoading(false);
      return;
    }

    setName(profileRes.data?.full_name ?? null);
    setAvatarUrl(profileRes.data?.avatar_url ?? null);
    setMemberSince(profileRes.data?.created_at ?? null);

    if (!ratingRes.error && ratingRes.data) {
      setAvgRating(ratingRes.data.avg_rating ?? 0);
      setTotalReviews(ratingRes.data.total_reviews ?? 0);
    }

    if (verifyRes.success) setVerification(verifyRes.data.status);
    if (listingsRes.success) setListings(listingsRes.data);

    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out ${name ?? 'this landlord'} on BasoBas!`,
      });
    } catch {
      // user cancelled
    }
  }, [name]);

  const isVerified = verification === 'VERIFIED';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={handleGoBack}
          style={styles.circleButton}
          accessibilityLabel="Go back"
          accessibilityRole="button">
          <ArrowLeft size={18} color={color.ink} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Landlord Profile</Text>
        <Pressable
          onPress={handleShare}
          style={styles.circleButton}
          accessibilityLabel="Share"
          accessibilityRole="button">
          <ShareIcon size={18} color={color.ink} strokeWidth={1.8} />
        </Pressable>
      </View>
      <View style={styles.headerDivider} />

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={color.brand} />
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* ─── Bio Card ──────────────────────────────────────────────── */}
          <View style={styles.bioCard}>
            {/* Avatar + Info */}
            <View style={styles.bioTopSection}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <User size={32} color={color.ink3} strokeWidth={1.5} />
                </View>
              )}
              <View style={styles.bioInfo}>
                <Text style={styles.bioName}>{name ?? 'Landlord'}</Text>
                <View style={[styles.verifiedBadge, !isVerified && styles.verifiedBadgeMuted]}>
                  {isVerified ? (
                    <CheckCircle size={13} color="#1A6B4A" strokeWidth={2} />
                  ) : (
                    <ShieldAlert size={13} color={color.ink3} strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      styles.verifiedText,
                      !isVerified && styles.verifiedTextMuted,
                    ]}>
                    {verificationLabel(verification)}
                  </Text>
                </View>
                <Text style={styles.memberSinceText}>
                  {memberSince ? `Member since ${yearOf(memberSince)}` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.bioDivider} />

            {/* 3-Column Stats (real numbers) */}
            <View style={styles.statsRow}>
              <View style={styles.statColumn}>
                <View style={styles.statStarRow}>
                  <Star size={14} color="#F5A623" fill="#F5A623" strokeWidth={1.5} />
                  <Text style={styles.statNumber}>
                    {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                  </Text>
                </View>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{totalReviews}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statColumn}>
                <Text style={styles.statNumber}>{listings.length}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
            </View>
          </View>

          {/* ─── Trust Highlights (real, derived from verification) ───── */}
          <View style={styles.trustCard}>
            <Text style={styles.trustTitle}>Why tenants trust {name?.split(' ')[0] ?? 'this landlord'}</Text>

            <View style={styles.trustRow}>
              <CheckCircle size={16} color="#1A6B4A" strokeWidth={2.5} />
              <Text style={styles.trustText}>
                {isVerified
                  ? 'Identity verified by the BasoBas team'
                  : 'Identity verification pending'}
              </Text>
            </View>
            <View style={styles.trustRow}>
              <CheckCircle size={16} color="#1A6B4A" strokeWidth={2.5} />
              <Text style={styles.trustText}>
                {listings.length} active listing{listings.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.trustRow}>
              <CheckCircle size={16} color="#1A6B4A" strokeWidth={2.5} />
              <Text style={styles.trustText}>
                {totalReviews > 0
                  ? `${totalReviews} review${totalReviews === 1 ? '' : 's'} from tenants`
                  : 'New to BasoBas — be the first to visit'}
              </Text>
            </View>
          </View>

          {/* ─── Segment Control ───────────────────────────────────────── */}
          <View style={styles.segmentContainer}>
            <Pressable
              onPress={() => setActiveTab('listings')}
              style={[styles.segmentTab, activeTab === 'listings' && styles.segmentTabActive]}
              accessibilityLabel="Active Listings"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'listings' }}>
              <Text style={[styles.segmentText, activeTab === 'listings' && styles.segmentTextActive]}>
                Active Listings
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('reviews')}
              style={[styles.segmentTab, activeTab === 'reviews' && styles.segmentTabActive]}
              accessibilityLabel="Reviews"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'reviews' }}>
              <Text style={[styles.segmentText, activeTab === 'reviews' && styles.segmentTextActive]}>
                Reviews
              </Text>
            </Pressable>
          </View>

          {/* ─── Active Listings Grid (real data) ──────────────────────── */}
          {activeTab === 'listings' &&
            (listings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No active listings right now</Text>
              </View>
            ) : (
              <View style={styles.listingsGrid}>
                {listings.map((listing) => (
                  <Pressable
                    key={listing.id}
                    style={styles.listingCard}
                    onPress={() =>
                      router.push({ pathname: '/(tenant)/property/[id]', params: { id: listing.id } } as any)
                    }
                    accessibilityLabel={`${listing.title} in ${listing.locationArea}`}
                    accessibilityRole="button">
                    {listing.photoUrls[0] ? (
                      <Image
                        source={{ uri: listing.photoUrls[0] }}
                        style={styles.listingImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.listingImage, styles.listingImagePlaceholder]}>
                        <View style={styles.availableBadge}>
                          <View style={styles.availableDot} />
                          <Text style={styles.availableText}>Available</Text>
                        </View>
                      </View>
                    )}
                    <View style={styles.listingContent}>
                      <Text style={styles.listingTitle} numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <Text style={styles.listingLocation} numberOfLines={1}>
                        {listing.locationArea}
                      </Text>
                      <Text style={styles.listingPrice}>{fmtNpr(listing.price)}/mo</Text>
                      <View style={styles.requestVisitRow}>
                        <Text style={styles.requestVisitText}>Request Visit</Text>
                        <ChevronRight size={14} color="#1A6B4A" strokeWidth={2.5} />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}

          {/* ─── Reviews Tab Placeholder ───────────────────────────────── */}
          {activeTab === 'reviews' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {totalReviews > 0
                  ? `${totalReviews} review${totalReviews === 1 ? '' : 's'} on file`
                  : 'No reviews yet'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },

  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink2,
    textAlign: 'center',
  },

  // Header
  header: {
    height: space.headerH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screenH,
    backgroundColor: color.bg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: color.ink,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.screenH,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Bio card
  bioCard: {
    borderRadius: radius.hero,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: color.bg,
    padding: space.cardPad,
  },
  bioTopSection: {
    flexDirection: 'row',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.input,
  },
  bioInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bioName: {
    fontFamily: font.semibold,
    fontSize: size.h3,
    color: color.ink,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5EE',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  verifiedBadgeMuted: {
    backgroundColor: color.canvas,
  },
  verifiedText: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: '#1A6B4A',
  },
  verifiedTextMuted: {
    color: color.ink3,
  },
  memberSinceText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginTop: 4,
  },

  // Divider
  bioDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: space.cardPad,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: font.bold,
    fontSize: size.h3,
    color: color.ink,
  },
  statLabel: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    marginTop: 2,
  },
  statStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },

  // Trust highlights
  trustCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: color.bg,
    padding: space.cardPad,
    marginTop: 14,
  },
  trustTitle: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
    marginBottom: 12,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  trustText: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
    flex: 1,
  },

  // Segment control
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: color.input,
    borderRadius: radius.pill,
    padding: 3,
    marginTop: 16,
  },
  segmentTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill - 2,
  },
  segmentTabActive: {
    backgroundColor: color.bg,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
  },
  segmentText: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink3,
  },
  segmentTextActive: {
    color: color.ink,
  },

  // Listings grid
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  listingCard: {
    width: '47%',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: color.bg,
    overflow: 'hidden',
  },
  listingImage: {
    height: 100,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 8,
  },
  listingImagePlaceholder: {
    backgroundColor: '#EBEBEB',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5EE',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1A6B4A',
  },
  availableText: {
    fontFamily: font.semibold,
    fontSize: size.micro,
    color: '#1A6B4A',
  },
  listingContent: {
    padding: 10,
    backgroundColor: color.bg,
    gap: 2,
  },
  listingTitle: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
  },
  listingLocation: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },
  listingPrice: {
    fontFamily: font.bold,
    fontSize: size.bodySm,
    color: color.ink,
    marginTop: 4,
  },
  requestVisitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  requestVisitText: {
    fontFamily: font.semibold,
    fontSize: size.caption,
    color: '#1A6B4A',
  },

  // Empty state (reviews)
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    marginTop: 16,
  },
  emptyStateText: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink3,
  },
});
