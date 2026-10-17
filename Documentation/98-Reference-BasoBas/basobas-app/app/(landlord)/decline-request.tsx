import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { ArrowRight, Check, X } from 'lucide-react-native';

import { Avatar, ScreenShell } from '@/src/components/visit/LandlordUI';
import { useVisitsStore } from '@/src/store/visitsStore';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { c, font, radius } from '@/src/theme/visitTokens';

const REASONS = [
  'Already rented out',
  'Tenant profile not a fit',
  'Time does not work',
  'Budget mismatch',
  'Other',
] as const;

export default function DeclineRequestScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const supabase = useClerkSupabase();
  const { user } = useUser();

  const row = useVisitsStore((s) => s.landlordVisits.find((v) => v.id === id));
  const landlordVisits = useVisitsStore((s) => s.landlordVisits);
  const fetchLandlordVisits = useVisitsStore((s) => s.fetchLandlordVisits);
  const declineVisit = useVisitsStore((s) => s.declineVisit);

  const [reason, setReason] = useState<string>(REASONS[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (id && landlordVisits.length === 0 && user?.id) {
      fetchLandlordVisits(supabase, user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const handleSend = useCallback(async () => {
    if (!id || sending) return;
    setSending(true);
    const text = message.trim() ? `${reason} — ${message.trim()}` : reason;
    const ok = await declineVisit(id, text, supabase);
    setSending(false);
    if (!ok) {
      Alert.alert('Could not decline', 'Please try again.');
      return;
    }
    setSent(true);
  }, [id, sending, reason, message, declineVisit, supabase]);

  const tenantName = row?.tenantName ?? 'the tenant';
  const propertyTitle = row?.propertyTitle ?? '';

  // ─── Sent state ────────────────────────────────────────────────────────────
  if (sent) {
    return (
      <ScreenShell title="Request Declined" showBack paddingBottom={48}>
        {/* Success hero — one block so the stack keeps its internal rhythm */}
        <View style={styles.hero}>
          <View style={styles.haloWrap}>
            <View style={styles.halo}>
              <View style={styles.haloInner}>
                <X size={28} color="#FFFFFF" strokeWidth={2.6} />
              </View>
            </View>
          </View>
          <Text style={styles.headline}>Request declined</Text>
          <Text style={styles.subcopy}>
            {tenantName} has been notified politely. Your listing stays active for other tenants.
          </Text>
        </View>

        <View style={styles.sentPanel}>
          <Text style={styles.sentLabel}>REASON SENT</Text>
          <Text style={styles.sentValue}>{reason}</Text>
          <View style={styles.sentCheck}>
            <Check size={15} color={c.accent} strokeWidth={3} />
          </View>
        </View>

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

  // ─── Form state ────────────────────────────────────────────────────────────
  return (
    <ScreenShell title="Decline Request" showBack paddingBottom={32}>
      {/* Applicant context */}
      <View style={styles.contextPanel}>
        <Avatar name={row?.tenantName ?? 'Tenant'} size={40} />
        <View style={styles.contextCopy}>
          <Text style={styles.contextName}>{tenantName}</Text>
          {propertyTitle ? <Text style={styles.contextMeta}>{propertyTitle}</Text> : null}
        </View>
      </View>

      {/* Pick a reason */}
      <Text style={styles.sectionLabel}>PICK A REASON</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reasonList}>
        {REASONS.map((option) => {
          const active = option === reason;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => setReason(option)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[styles.reasonRow, active && styles.reasonRowActive]}>
              <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{option}</Text>
              <View style={[styles.reasonCheck, active && styles.reasonCheckActive]}>
                {active ? <Check size={12} color={c.ink} strokeWidth={3} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Message (optional) */}
      <Text style={styles.sectionLabel}>MESSAGE (OPTIONAL)</Text>
      <View style={styles.messageCard}>
        <TextInput
          style={styles.messageInput}
          placeholder="Thanks for your interest — wishing you luck finding the right place."
          placeholderTextColor={c.faint}
          multiline
          value={message}
          onChangeText={setMessage}
          textAlignVertical="top"
        />
      </View>

      {/* Actions */}
      <TouchableOpacity
        onPress={handleSend}
        disabled={sending}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Send decline"
        style={[styles.sendBtn, sending && styles.disabled]}>
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={styles.sendRow}>
            <Text style={styles.sendText}>Send decline</Text>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        disabled={sending}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        style={[styles.cancelBtn, sending && styles.disabled]}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  contextPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    padding: 12,
    marginBottom: 4,
  },
  contextCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  contextName: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  contextMeta: {
    marginTop: 3,
    fontFamily: font.sans,
    fontSize: 11,
    color: c.faint,
  },
  sectionLabel: {
    fontFamily: font.sansSemi,
    fontSize: 10,
    color: c.faint,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  reasonList: {
    paddingBottom: 2,
  },
  reasonRow: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: c.surfaceGrey,
    marginBottom: 8,
  },
  reasonRowActive: {
    backgroundColor: c.ink,
  },
  reasonText: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  reasonTextActive: {
    color: '#FFFFFF',
  },
  reasonCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonCheckActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  messageCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  messageInput: {
    minHeight: 72,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 18,
    color: c.inkSub,
  },
  sendBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendText: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: '#FFFFFF',
    marginRight: 8,
  },
  cancelBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  disabled: {
    opacity: 0.5,
  },
  haloWrap: {
    alignItems: 'center',
    marginTop: 40,
  },
  halo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E53E3E',
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
  hero: {
    alignItems: 'center',
  },
  sentPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    padding: 16,
  },
  sentLabel: {
    fontFamily: font.sansSemi,
    fontSize: 10,
    color: c.faint,
    letterSpacing: 1,
    marginRight: 12,
  },
  sentValue: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.sansSemi,
    fontSize: 13,
    color: c.ink,
  },
  sentCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
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
