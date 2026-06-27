import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  autoFocus?: boolean;
}

interface OTPCellProps {
  char: string;
  /** True when the cursor sits at this cell (next empty slot). */
  isActive: boolean;
  isFilled: boolean;
}

// ─── OTPCell ───────────────────────────────────────────────────────────────────

const OTPCell = React.memo(({ char: _char, isActive, isFilled }: OTPCellProps) => {
  // Scale up when active
  const scale = useSharedValue(1);
  // Blinking cursor opacity
  const cursorOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.07 : 1, { damping: 14, stiffness: 200 });

    if (isActive) {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        false,
      );
    } else {
      cursorOpacity.value = withTiming(0, { duration: 80 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const cellAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.cell,
        isFilled ? styles.cellFilled : isActive ? styles.cellActive : styles.cellEmpty,
        cellAnimStyle,
      ]}>
      {isFilled ? (
        // Masking dot — same visual as iOS password bullet
        <View style={styles.dot} />
      ) : isActive ? (
        // Blinking cursor bar
        <Animated.View style={[styles.cursor, cursorStyle]} />
      ) : null}
    </Animated.View>
  );
});

OTPCell.displayName = 'OTPCell';

// ─── OTPInput ──────────────────────────────────────────────────────────────────

/**
 * Accessible 6-digit OTP input using a SINGLE hidden TextInput.
 *
 * Architecture: a transparent `TextInput` (1×1 px) sits behind all cells and
 * holds the full OTP string. Tapping anywhere on the row focuses it. The visual
 * cells derive their state from the `value` prop length, so there is no complex
 * multi-ref jumping logic — backspace and paste work natively.
 */
export const OTPInput = React.memo(
  ({ length = 6, value, onChange, onComplete, autoFocus = true }: OTPInputProps) => {
    const inputRef = useRef<TextInput>(null);

    const handleChange = (text: string) => {
      const cleaned = text.replace(/\D/g, '').slice(0, length);
      onChange(cleaned);
      if (cleaned.length === length) {
        onComplete?.(cleaned);
      }
    };

    return (
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.row}
        accessibilityLabel="OTP input"
        accessibilityRole="none">
        {Array.from({ length }).map((_, i) => (
          <OTPCell
            key={i}
            char={value[i] ?? ''}
            isFilled={i < value.length}
            // cursor sits at the next unfilled position
            isActive={i === value.length && i < length}
          />
        ))}

        {/* Hidden TextInput — captures all keyboard input */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          maxLength={length}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          caretHidden
          // Completely invisible but focusable
          style={styles.hiddenInput}
          importantForAccessibility="no"
        />
      </Pressable>
    );
  },
);

OTPInput.displayName = 'OTPInput';

// ─── Styles ────────────────────────────────────────────────────────────────────

const CELL_W = 46;
const CELL_H = 58;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
  },

  cell: {
    flex: 1,
    height: CELL_H,
    maxWidth: CELL_W,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cellFilled: {
    backgroundColor: '#0A0A0A', // ink
  },

  cellActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },

  cellEmpty: {
    backgroundColor: '#F5F5F5', // input
  },

  /** White masking bullet shown in filled cells */
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },

  /** Thin blinking bar shown in the active empty cell */
  cursor: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: '#0A0A0A',
  },

  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    top: 0,
    left: 0,
  },
});
