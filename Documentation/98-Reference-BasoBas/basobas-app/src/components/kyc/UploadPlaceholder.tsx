import React from 'react';
import { StyleSheet, View } from 'react-native';
import { UploadCloud } from 'lucide-react-native';

import { tokens } from '@/src/theme/tokens';

const { color, size } = tokens;

/**
 * `UploadPlaceholder` — the empty-state illustration shown inside
 * `DocumentUploadCard`'s dropzone.
 *
 * Constructed from plain `View`s rather than SVG so it renders identically
 * on Android / iOS / web without extra dependencies:
 *   - Outer dashed-border `View` (the document frame)
 *   - Four absolutely-positioned corner brackets that reinforce the
 *     "place a document here" reading
 *   - Centered 48×48 brand-tinted circle with the upload-cloud icon
 *
 * Sized via flex so it adapts to whatever height the parent drops it into.
 */
export const UploadPlaceholder: React.FC = () => {
  return (
    <View style={styles.frame} accessibilityElementsHidden>
      {/* Corner brackets */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* Centered icon stack */}
      <View style={styles.iconWrap}>
        <UploadCloud size={26} color={color.brand} strokeWidth={2.2} />
      </View>
    </View>
  );
};

UploadPlaceholder.displayName = 'UploadPlaceholder';

const BRACKET = 18;
const BORDER = 2;
const INNER = 48;

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
    borderWidth: BORDER,
    borderStyle: 'dashed',
    borderColor: color.line,
    backgroundColor: color.bg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Four corner brackets sit just inside the frame. Each is a 18×18 box
  // with two thick edges (one horizontal, one vertical) anchored to its
  // own corner. Drawn as Views rather than borders so we can swap colors /
  // sizes without rebuilding the dashed-border frame.
  corner: {
    position: 'absolute',
    width: BRACKET,
    height: BRACKET,
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: color.brand,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: color.brand,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: color.brand,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: color.brand,
    borderBottomRightRadius: 4,
  },

  iconWrap: {
    width: INNER,
    height: INNER,
    borderRadius: 999,
    backgroundColor: color.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Unused — kept for downstream override hooks (e.g. size.micro in tokens).
  _phantom: { fontSize: size.micro },
});