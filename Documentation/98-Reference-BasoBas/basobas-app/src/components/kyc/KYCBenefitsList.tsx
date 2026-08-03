import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';

const { color, font, size, space } = tokens;

interface Benefit {
  title: string;
  supporting: string;
}

const BENEFITS: readonly Benefit[] = [
  {
    title: 'Faster visit approvals',
    supporting: 'Landlords prioritize verified tenants for visits.',
  },
  {
    title: 'Verified Tenant badge',
    supporting: 'A green check on your profile that builds trust.',
  },
  {
    title: 'Priority in landlord inbox',
    supporting: 'Your requests land at the top of the list.',
  },
];

/**
 * `KYCBenefitsList` — three plain rows explaining why a tenant should verify.
 * Sits on the white background directly, not inside a card — context, not
 * another competing surface.
 */
export const KYCBenefitsList: React.FC = () => (
  <View style={styles.container} accessibilityLabel="Why verify your identity">
    {BENEFITS.map((b) => (
      <View key={b.title} style={styles.row}>
        <View style={styles.iconCell}>
          <Check size={14} color={color.brand} strokeWidth={2.6} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>{b.title}</Text>
          <Text style={styles.supporting}>{b.supporting}</Text>
        </View>
      </View>
    ))}
  </View>
);

KYCBenefitsList.displayName = 'KYCBenefitsList';

const styles = StyleSheet.create({
  container: {
    gap: space.cardPad,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCell: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: color.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: font.medium,
    fontSize: size.body, // 15
    color: color.ink,
  },
  supporting: {
    fontFamily: font.sans,
    fontSize: size.caption, // 12
    color: color.ink2,
    lineHeight: 18,
    marginTop: 2,
  },
});