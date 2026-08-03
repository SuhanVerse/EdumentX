import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@clerk/expo';
import {
  Settings,
  MapPin,
  CheckCircle,
  Star,
  Plus,
  User,
  ShieldCheck,
  Calendar,
  Bell,
  LogOut,
  ChevronRight,
  Pencil,
} from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/store/authStore';
import { useAuth } from '@/src/hooks/useAuth';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import {
  getMyProperties,
  getLandlordVerificationStatus,
  getLandlordRating,
  type LandlordVerificationStatus,
} from '@/src/services/properties.service';
import {
  formatMonthlyPrice,
  type LandlordPropertySummary,
  type PropertyStatusUi,
} from '@/src/types/property.types';

const { color, space, radius, font, size } = tokens;

// ─── Verification display ────────────────────────────────────────────────────

const VERIFICATION_COPY: Record<
  LandlordVerificationStatus,
  { pill: string; badge: string; subtext: string }
> = {
  VERIFIED: {
    pill: 'Verified',
    badge: 'Identity Verified',
    subtext: 'Your documents have been approved.',
  },
  UNDER_REVIEW: {
    pill: 'In review',
    badge: 'Verification in review',
    subtext: 'We are checking your documents.',
  },
  REJECTED: {
    pill: 'Action needed',
    badge: 'Verification rejected',
    subtext: 'Resubmit your documents to publish listings.',
  },
  UNVERIFIED: {
    pill: 'Not verified',
    badge: 'Not verified',
    subtext: 'Verify your identity to publish listings.',
  },
};

// ─── Status badge styles ─────────────────────────────────────────────────────

const STATUS_BADGE_STYLES: Record<
  PropertyStatusUi,
  { label: string; bg: string; text: string }
> = {
  active:   { label: 'Active',   bg: '#E8F5EE', text: '#1A6B4A' },
  draft:    { label: 'Draft',    bg: '#FEF3C7', text: '#92400E' },
  paused:   { label: 'Paused',   bg: '#F3F4F6', text: '#6B7280' },
  archived: { label: 'Archived', bg: '#F3F4F6', text: '#6B7280' },
};

// ─── Screen ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return 'L';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function LandlordProfileTab() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { logout } = useAuth();
  const { user } = useUser();
  const supabase = useClerkSupabase();
  const clerkId = user?.id;

  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');
  const [properties, setProperties] = useState<LandlordPropertySummary[]>([]);
  const [verification, setVerification] =
    useState<LandlordVerificationStatus>('UNVERIFIED');
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = profile?.full_name ?? 'Landlord';
  const displayLocation = profile?.city ? `${profile.city}, Nepal` : 'Location not set';
  const initials = useMemo(() => getInitials(profile?.full_name ?? null), [profile?.full_name]);

  const avatarUri = useMemo(() => {
    if (!profile?.avatar_url) return null;
    const ts = profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now();
    return `${profile.avatar_url}?t=${ts}`;
  }, [profile?.avatar_url, profile?.updated_at]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!clerkId) return;
      if (mode === 'refresh') setRefreshing(true);

      const [listings, status, rating] = await Promise.all([
        getMyProperties(clerkId, supabase),
        getLandlordVerificationStatus(clerkId, supabase),
        getLandlordRating(clerkId, supabase),
      ]);

      if (listings.success) setProperties(listings.data);
      else console.warn('[profile] listings failed:', listings.error);

      if (status.success) setVerification(status.data);
      else console.warn('[profile] verification failed:', status.error);

      if (rating.success) {
        setAvgRating(rating.data.avgRating);
        setTotalReviews(rating.data.totalReviews);
      } else {
        console.warn('[profile] rating failed:', rating.error);
      }

      setRefreshing(false);
    },
    [clerkId, supabase],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load('refresh');
    }, [load]),
  );

  // Only published, non-archived listings belong on a public-facing profile.
  const publishedListings = useMemo(
    () => properties.filter((p) => !p.isDraft && !p.isDeleted),
    [properties],
  );

  const verificationCopy = VERIFICATION_COPY[verification];
  const isVerified = verification === 'VERIFIED';

  const handleSettings = useCallback(() => {
    router.push('/(landlord)/settings' as any);
  }, [router]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable
          onPress={handleSettings}
          style={styles.settingsButton}
          accessibilityLabel="Settings"
          accessibilityRole="button">
          <Settings size={18} color={color.ink} />
        </Pressable>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />
        }>
        {/* ─── Profile Card ──────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          {/* Avatar + Info */}
          <View style={styles.profileTopSection}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Pencil size={12} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>

            {/* Name + Location + Verified */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>

              <View style={styles.locationRow}>
                <MapPin size={13} color={color.ink2} strokeWidth={1.8} />
                <Text style={styles.locationText}>{displayLocation}</Text>
              </View>

              <View style={[styles.verifiedBadge, !isVerified && styles.unverifiedBadge]}>
                <CheckCircle
                  size={13}
                  color={isVerified ? '#1A6B4A' : color.ink3}
                  strokeWidth={2}
                />
                <Text style={[styles.verifiedText, !isVerified && styles.unverifiedText]}>
                  {verificationCopy.badge}
                </Text>
              </View>

              <Text style={styles.verifiedSubtext}>{verificationCopy.subtext}</Text>
            </View>
          </View>

          <View style={styles.profileDivider} />

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={styles.statNumber}>{publishedListings.length}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <View style={styles.statStarRow}>
                <Star size={14} color="#F5A623" fill="#F5A623" strokeWidth={1.5} />
                <Text style={styles.statNumber}>
                  {totalReviews > 0 ? avgRating.toFixed(1) : '—'}
                </Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statNumber}>{totalReviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>
        </View>

        {/* ─── Segment Control ───────────────────────────────────────── */}
        <View style={styles.segmentContainer}>
          <Pressable
            onPress={() => setActiveTab('listings')}
            style={[styles.segmentTab, activeTab === 'listings' && styles.segmentTabActive]}
            accessibilityLabel="My Listings"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'listings' }}>
            <Text style={[styles.segmentText, activeTab === 'listings' && styles.segmentTextActive]}>
              My Listings
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

        {/* ─── My Listings Grid ──────────────────────────────────────── */}
        {activeTab === 'listings' && (
          <>
            <View style={styles.listingsGrid}>
              {publishedListings.map((listing) => {
                const cover = listing.photoUrls[0];
                const st = STATUS_BADGE_STYLES[listing.statusUi];
                return (
                  <Pressable
                    key={listing.id}
                    style={styles.listingCard}
                    onPress={() =>
                      router.push({
                        pathname: '/(landlord)/listing/[id]',
                        params: { id: listing.id },
                      } as any)
                    }
                    accessibilityLabel={`${listing.title} in ${listing.locationArea}`}
                    accessibilityRole="button">
                    <View style={styles.listingImage}>
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.listingThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.listingThumb, styles.listingThumbFallback]}>
                          <Text style={styles.listingThumbFallbackText}>No photo</Text>
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: st.text }]}>{st.label}</Text>
                      </View>
                    </View>
                    <View style={styles.listingContent}>
                      <Text style={styles.listingTitle} numberOfLines={1}>
                        {listing.title}
                      </Text>
                      <Text style={styles.listingLocation} numberOfLines={1}>
                        {listing.locationArea}
                      </Text>
                      <Text style={styles.listingPrice}>
                        {formatMonthlyPrice(listing.price)}
                      </Text>
                      <Text style={styles.listingRequests}>
                        {listing.requests}{' '}
                        {listing.requests === 1 ? 'request' : 'requests'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {publishedListings.length === 0 && (
              <Text style={styles.emptyListings}>
                You have no published listings yet.
              </Text>
            )}

            {/* Add New Listing */}
            <Pressable
              style={styles.addListingButton}
              onPress={() => router.push('/(landlord)/listing/new/step-1' as any)}
              accessibilityLabel="Add new listing"
              accessibilityRole="button">
              <Plus size={18} color={color.ink3} strokeWidth={2} />
              <Text style={styles.addListingText}>Add New Listing</Text>
            </Pressable>
          </>
        )}

        {/* ─── Reviews Tab Placeholder ───────────────────────────────── */}
        {activeTab === 'reviews' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Reviews coming soon</Text>
          </View>
        )}

        {/* ─── ACCOUNT Section ───────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        <View style={styles.menuCard}>
          {/* Edit Profile */}
          <Pressable
            onPress={() => router.push('/(landlord)/edit-profile' as any)}
            style={[styles.menuRow, styles.menuRowBorder]}>
            <View style={styles.menuIcon}>
              <User size={18} color={color.ink} strokeWidth={1.8} />
            </View>
            <Text style={styles.menuLabel}>Edit Profile</Text>
            <ChevronRight size={18} color={color.ink2} strokeWidth={1.8} />
          </Pressable>

          {/* Verification Status */}
          <Pressable
            onPress={() => {
              if (verification === 'REJECTED') {
                router.push('/(landlord)/kyc-upload?resubmit=true' as any);
              } else {
                router.push('/(landlord)/verification' as any);
              }
            }}
            style={[styles.menuRow, styles.menuRowBorder]}>
            <View style={styles.menuIcon}>
              <ShieldCheck size={18} color={color.ink} strokeWidth={1.8} />
            </View>
            <Text style={styles.menuLabel}>Verification Status</Text>
            <View style={[styles.verifiedPill, !isVerified && styles.unverifiedPill]}>
              <Text
                style={[
                  styles.verifiedPillText,
                  !isVerified && styles.unverifiedPillText,
                ]}>
                {verificationCopy.pill}
              </Text>
            </View>
          </Pressable>

          {/* Visit History */}
          <Pressable
            onPress={() => router.push('/(landlord)/visits' as any)}
            style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <Calendar size={18} color={color.ink} strokeWidth={1.8} />
            </View>
            <Text style={styles.menuLabel}>Visit History</Text>
            <ChevronRight size={18} color={color.ink2} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* ─── PREFERENCES Section ───────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>

        <View style={styles.menuCard}>
          {/* Notifications */}
          <Pressable
            onPress={() => router.push('/(landlord)/notifications' as any)}
            style={styles.menuRow}>
            <View style={styles.menuIcon}>
              <Bell size={18} color={color.ink} strokeWidth={1.8} />
            </View>
            <Text style={styles.menuLabel}>Notifications</Text>
            <ChevronRight size={18} color={color.ink2} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* ─── Log Out ───────────────────────────────────────────────── */}
        <Pressable onPress={logout} style={styles.logoutButton} accessibilityLabel="Log out" accessibilityRole="button">
          <LogOut size={18} color={color.danger} strokeWidth={1.8} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.versionText}>BasoBas v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },

  // Header
  header: {
    height: space.headerH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screenH,
    backgroundColor: color.bg,
  },
  headerTitle: {
    fontFamily: font.display,
    fontSize: 24,
    color: color.ink,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.input,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 120,
  },

  // Profile card
  profileCard: {
    borderRadius: radius.hero,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: color.bg,
    padding: space.cardPad,
  },
  profileTopSection: {
    flexDirection: 'row',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarText: {
    fontFamily: font.bold,
    fontSize: size.h3,
    color: color.ink2,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.bg,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: font.semibold,
    fontSize: size.h3,
    color: color.ink,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink2,
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
    marginTop: 8,
  },
  verifiedText: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: '#1A6B4A',
  },
  // Anything other than VERIFIED reads as neutral, not as a green success state.
  unverifiedBadge: {
    backgroundColor: color.input,
  },
  unverifiedText: {
    color: color.ink2,
  },
  verifiedSubtext: {
    fontFamily: font.sans,
    fontSize: size.label,
    color: color.ink3,
    marginTop: 4,
  },

  // Divider
  profileDivider: {
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
    fontSize: size.h2,
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
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },

  // Segment control
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: color.input,
    borderRadius: radius.pill,
    padding: 3,
    marginTop: 20,
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
    backgroundColor: '#E5E7EB',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  // Cover photo sits behind the badge, so it's absolute rather than in flow.
  listingThumb: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  listingThumbFallback: {
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingThumbFallbackText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontFamily: font.semibold,
    fontSize: size.micro,
  },
  listingContent: {
    padding: 10,
    gap: 2,
    backgroundColor: color.bg,
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
  listingRequests: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
  },
  emptyListings: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    color: color.ink3,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // Add listing
  addListingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    backgroundColor: color.input,
    paddingVertical: 16,
    marginTop: 12,
  },
  addListingText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink3,
  },

  // Empty state (reviews)
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontFamily: font.sans,
    fontSize: size.body,
    color: color.ink3,
  },

  // Section label
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: size.caption,
    color: color.ink3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 10,
  },

  // Menu card
  menuCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: color.bg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: space.cardPad,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.ink,
  },
  verifiedPill: {
    backgroundColor: '#E8F5EE',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedPillText: {
    fontFamily: font.semibold,
    fontSize: size.caption,
    color: '#1A6B4A',
  },
  unverifiedPill: {
    backgroundColor: color.input,
  },
  unverifiedPillText: {
    color: color.ink2,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 12,
  },
  logoutText: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.danger,
  },
  versionText: {
    fontFamily: font.sans,
    fontSize: size.caption,
    color: color.ink3,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
});
