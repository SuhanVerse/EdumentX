import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/src/theme/tokens';

const { color, font, radius, size } = tokens;

export type KYCDocumentType = 'CITIZENSHIP' | 'NATIONAL_ID';

interface Option {
  value: KYCDocumentType;
  title: string;
  description: string;
}

const OPTIONS: readonly Option[] = [
  {
    value: 'CITIZENSHIP',
    title: 'Citizenship',
    description: 'Issued by National ID Dept.',
  },
  {
    value: 'NATIONAL_ID',
    title: 'National ID',
    description: 'Issued by municipality',
  },
];

export interface DocumentTypeSelectorProps {
  value: KYCDocumentType;
  onChange: (next: KYCDocumentType) => void;
}

/**
 * `DocumentTypeSelector` — radio-card grid for choosing between Citizenship
 * and National ID on the KYC upload screen.
 *
 * Visual: two side-by-side cards, each with a radio dot, title, and short
 * description. Selected card has `borderColor.color.brand`, light brand
 * background, and a filled brand dot. Unselected stays on `bg` with a grey
 * outline.
 *
 * Sized to match the upload-card width so the selector and the upload card
 * stack visually as a single coherent column. The component is intentionally
 * a controlled input — it owns no internal state, so the parent can
 * pre-select from a previous submission or reset it on resubmit.
 */
export const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Document type"
      style={styles.container}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${opt.title} — ${opt.description}`}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.card,
              active && styles.cardActive,
              pressed && styles.cardPressed,
            ]}>
            <View style={[styles.radio, active && styles.radioActive]}>
              {active && <View style={styles.radioDot} />}
            </View>
            <View style={styles.cardCopy}>
              <Text style={[styles.cardTitle, active && styles.cardTitleActive]}>
                {opt.title}
              </Text>
              <Text style={styles.cardDescription} numberOfLines={2}>
                {opt.description}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

DocumentTypeSelector.displayName = 'DocumentTypeSelector';

const styles = StyleSheet.create({
  // Outer container is width-aware so the two cards always split the
  // available horizontal space — even when the parent view doesn't itself
  // pass a `width: '100%'` (e.g. inside a ScrollView that measures children
  // with `align-items: stretch`).
  container: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: 0, // critical — allows the inner Text to shrink rather than push the card off-screen
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.line,
    backgroundColor: color.bg,
  },
  cardActive: {
    borderColor: color.brand,
    backgroundColor: color.brandLight,
  },
  cardPressed: {
    opacity: 0.7,
  },

  // Radio indicator — an outlined circle that fills with brand on selection.
  radio: {
    width: 18,
    height: 18,
    flexShrink: 0, // never squashed by the sibling copy column
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: color.ink3,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioActive: {
    borderColor: color.brand,
    borderWidth: 2,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: color.brand,
  },

  // `minWidth: 0` lets the inner Text actually shrink when the parent
  // container gets narrow. Without it the Text "wants" its intrinsic
  // width and pushes the second card off-screen on small phones.
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    fontFamily: font.semibold,
    fontSize: size.bodySm,
    color: color.ink,
    lineHeight: 18,
  },
  cardTitleActive: {
    color: color.brand,
  },
  cardDescription: {
    fontFamily: font.sans,
    fontSize: size.caption - 1, // 11 — tight enough to fit two lines on narrow screens
    color: color.ink2,
    lineHeight: 14,
  },
});