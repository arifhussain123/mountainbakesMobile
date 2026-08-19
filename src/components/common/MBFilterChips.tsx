import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MBPressable } from './MBPressable';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/spacing';

/**
 * A row of single-select filter chips.
 *
 * The same twenty lines — a `MBPressable` in a pill, tinted when selected,
 * carrying `accessibilityState={{selected}}` — were being written per screen,
 * and the admin phase would have added five more copies. Copies drift: one row
 * forgets the `selected` state and stops announcing itself to a screen reader,
 * another uses `primary` where its neighbour uses `accent`, and the app grows
 * four idioms for one control the way press feedback once did.
 *
 * `tone` exists because the difference IS meaningful where two rows stack:
 * Products puts categories (`primary`) above status (`accent`) so the two
 * scrollers cannot be mistaken for one. It is a token choice, not a colour.
 *
 * `scroll` is off by default. A short fixed set — three statuses — should wrap
 * and stay entirely visible; only an unbounded set (every category, every
 * branch) earns a horizontal scroller, where anything past the fold is
 * discoverable only by dragging.
 */

export interface FilterChip {
  key: string;
  label: string;
}

export interface MBFilterChipsProps {
  options: readonly FilterChip[];
  selectedKey: string;
  onSelect: (key: string) => void;
  /** `primary` for the dominant filter, `accent` for a secondary row beneath it. */
  tone?: 'primary' | 'accent';
  /** Horizontal scroller, for an unbounded set. */
  scroll?: boolean;
  testIDPrefix?: string;
}

export function MBFilterChips({
  options,
  selectedKey,
  onSelect,
  tone = 'primary',
  scroll = false,
  testIDPrefix,
}: MBFilterChipsProps): React.ReactElement {
  const theme = useTheme();
  const active = tone === 'accent' ? theme.colors.accent : theme.colors.primary;

  const chips = options.map(option => {
    const selected = option.key === selectedKey;
    return (
      <MBPressable
        key={option.key}
        onPress={() => onSelect(option.key)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        {...(testIDPrefix ? { testID: `${testIDPrefix}-${option.key}` } : {})}
        style={[
          styles.chip,
          {
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.space.lg,
            backgroundColor: selected ? active : theme.colors.surface,
            borderColor: selected ? active : theme.colors.border,
          },
        ]}>
        <Text
          style={[
            theme.type.label,
            { color: selected ? theme.colors.onPrimary : theme.colors.text },
          ]}>
          {option.label}
        </Text>
      </MBPressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }

  return <View style={styles.wrap}>{chips}</View>;
}

const styles = StyleSheet.create({
  chip: {
    height: layout.chipH,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  row: { gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
