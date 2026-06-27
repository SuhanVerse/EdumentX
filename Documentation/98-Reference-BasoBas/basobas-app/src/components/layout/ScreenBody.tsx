import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens } from '@/src/theme/tokens';

/**
 * `DockSpacer` — vertical space equal to the floating dock so content
 * never hides under it. Use inside a `ScrollView` content container.
 *
 *   tokens.space.dockH (64) + bottomOffset (8) + safeBottom + breathing-room (8)
 */
export const dockBottomReserve = (safeBottom: number) =>
  tokens.space.dockH + 8 + Math.max(0, safeBottom) + 8;

interface ScreenBodyProps {
  children: ReactNode;
}

/**
 * `ScreenBody` — flex-1 column with a dock-safe bottom region.
 *
 * Use for tab screens that don't need their own bottom sticky bar.
 * Reserves `dockH + 8 + safeBottom + 8` of empty space at the bottom so
 * the absolutely-positioned dock never covers content.
 */
export const ScreenBody = ({ children }: ScreenBodyProps) => {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      {children}
      <View style={{ height: dockBottomReserve(insets.bottom) }} pointerEvents="none" />
    </SafeAreaView>
  );
};

interface ScreenBodyWithActionProps {
  /** Sticky content rendered above the dock, e.g. a primary CTA. */
  action: ReactNode;
  /** Optional ScrollView overrides. */
  scrollProps?: ScrollViewProps;
  /** Optional View overrides for the top content. */
  contentProps?: ViewProps;
  children?: ReactNode;
}

/**
 * `ScreenBodyWithAction` — for screens with a sticky bottom action
 * (e.g. the search screen's "Show 240 results" button). Lifts the
 * action up by the dock's height so the dock never overlaps it.
 */
export const ScreenBodyWithAction = ({
  action,
  scrollProps,
  contentProps,
  children,
}: ScreenBodyWithActionProps) => {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={[
          { paddingTop: 16, paddingBottom: 16 },
          (contentProps as { style?: unknown } | undefined)?.style as object,
        ]}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}>
        {children}
      </ScrollView>

      {/* Sticky action — lifted above the floating dock. */}
      <View
        className="border-t border-line bg-bg px-6 pt-3"
        style={{ paddingBottom: insets.bottom + 8 }}
        {...contentProps}>
        {action}
      </View>
    </SafeAreaView>
  );
};

ScreenBody.displayName = 'ScreenBody';
ScreenBodyWithAction.displayName = 'ScreenBodyWithAction';
