import { Children, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

interface VStackProps {
  children: ReactNode;
  /** Vertical space between children, applied as marginTop (not `gap`). */
  gap: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * VStack — column layout with spacing applied via margins instead of the
 * `gap` style property. `gap` can silently fail to render on some RN
 * versions / architectures (dev builds especially), so the visit flow
 * uses this for its vertical rhythm. Each child is wrapped in a plain
 * View, so only use it with block-level content.
 */
export const VStack = ({ children, gap, style }: VStackProps) => {
  const kids = Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
      {kids.map((child, i) => (
        <View key={i} style={i > 0 ? { marginTop: gap } : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
};
