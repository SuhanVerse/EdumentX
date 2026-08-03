import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';

const { color, font, size, radius, space } = tokens;

interface Props {
  rejectionReason: string | null;
  title?: string;
}

export const KYCRejectionNotice: React.FC<Props> = ({
  rejectionReason,
  title = 'Verification Rejected',
}) => {
  const reason =
    rejectionReason && rejectionReason.trim().length > 0
      ? rejectionReason
      : 'No reason was provided. Please resubmit updated documents.';

  return (
    <View style={styles.card} accessibilityLabel={`${title}. ${reason}`}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <AlertCircle size={16} color={color.danger} strokeWidth={2.2} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.reasonWrap}>
        <Text style={styles.reason}>{reason}</Text>
      </View>
    </View>
  );
};

KYCRejectionNotice.displayName = 'KYCRejectionNotice';

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    borderLeftWidth: 3,
    borderLeftColor: color.danger,
    padding: space.cardPad,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: color.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: font.semibold,
    fontSize: size.body,
    color: color.danger,
  },
  reasonWrap: {
    backgroundColor: color.input,
    borderRadius: radius.card,
    padding: space.cardPad,
  },
  reason: {
    fontFamily: font.sans,
    fontSize: size.bodySm,
    lineHeight: 20,
    color: color.ink,
  },
});
