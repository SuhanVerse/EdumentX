import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, Calendar } from 'lucide-react-native';

import { LdCard, ScreenShell } from '@/src/components/visit/LandlordUI';
import { c, font, radius } from '@/src/theme/visitTokens';

export default function RescheduleSentScreen() {
  const router = useRouter();
  const { tenant, proposal, original } = useLocalSearchParams<{
    tenant?: string;
    proposal?: string;
    original?: string;
  }>();

  return (
    <ScreenShell title="Reschedule Sent" showBack paddingBottom={48}>
      {/* Success hero — one block so the stack keeps its internal rhythm */}
      <View style={styles.hero}>
        <View style={styles.haloWrap}>
          <View style={styles.halo}>
            <View style={styles.haloInner}>
              <Calendar size={26} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          </View>
        </View>
        <Text style={styles.headline}>New time proposed</Text>
        <Text style={styles.subcopy}>
          {tenant ?? 'The tenant'} will get a notification to confirm the new visit time.
        </Text>
      </View>

      {/* Before → after card */}
      <LdCard padding={16} radius={18}>
        <View style={styles.compareRow}>
          <View style={styles.insetOld}>
            <Text style={styles.compareLabel}>Original</Text>
            <Text numberOfLines={1} style={styles.compareOld}>
              {original ?? 'Original time'}
            </Text>
          </View>
          <ArrowRight size={16} color="#CCCCCC" strokeWidth={2} />
          <View style={styles.insetNew}>
            <Text style={styles.compareLabel}>New</Text>
            <Text numberOfLines={1} style={styles.compareNew}>
              {proposal ?? 'Proposed time'}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusValue}>Awaiting tenant</Text>
        </View>
      </LdCard>

      <TouchableOpacity
        onPress={() => router.replace('/(landlord)/(tabs)/requests' as any)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Back to requests"
        style={styles.primaryBtn}>
        <Text style={styles.primaryText}>Back to requests</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  haloWrap: {
    alignItems: 'center',
    marginTop: 40,
  },
  halo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5A623',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    marginTop: 20,
    fontFamily: font.serif,
    fontSize: 24,
    color: c.ink,
    textAlign: 'center',
  },
  subcopy: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 18,
    color: c.meta,
    textAlign: 'center',
    maxWidth: 280,
    alignSelf: 'center',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insetOld: {
    flex: 1,
    minWidth: 0,
    backgroundColor: c.surfaceGrey,
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
  },
  insetNew: {
    flex: 1,
    minWidth: 0,
    backgroundColor: c.greenBg,
    borderRadius: 14,
    padding: 12,
    marginLeft: 10,
  },
  compareLabel: {
    fontFamily: font.sansSemi,
    fontSize: 10,
    color: c.faint,
  },
  compareOld: {
    marginTop: 4,
    fontFamily: font.sans,
    fontSize: 12,
    color: c.faint,
    textDecorationLine: 'line-through',
  },
  compareNew: {
    marginTop: 4,
    fontFamily: font.sansSemi,
    fontSize: 12,
    color: c.accent,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: c.hairlineSoft,
    marginTop: 14,
    paddingTop: 12,
  },
  statusLabel: {
    fontFamily: font.sans,
    fontSize: 11,
    color: c.faint,
  },
  statusValue: {
    fontFamily: font.sansSemi,
    fontSize: 11,
    color: '#B45309',
  },
  hero: {
    alignItems: 'center',
  },
  primaryBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
