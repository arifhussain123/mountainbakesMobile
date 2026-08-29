import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MBPressable } from './MBPressable';
import { useTheme } from '@/common/theme/ThemeProvider';
import { layout, space } from '@/common/theme/spacing';

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
  /**
   * How many rows this filter would show, drawn after the label.
   *
   * Only for a row filtering a set the screen **already holds**. A count beside
   * a filter that refetches is a promise the screen cannot keep: it is either
   * the previous answer's figure or a number fetched separately, and both go
   * stale the moment the list does. Leave it undefined and the chip is exactly
   * what it was before.
   *
   * `0` draws, and is the point — a filter that would show nothing is worth
   * knowing about before it empties the screen.
   */
  count?: number;
  /**
   * Overrides the chip's accessible name.
   *
   * For a row whose labels only make sense next to each other — "Today",
   * "Yesterday", "−2 days" — where a reader lands on one chip with none of that
   * context and hears a bare date offset.
   */
  accessibilityLabel?: string;
}

export interface MBFilterChipsProps {
  options: readonly FilterChip[];
  selectedKey: string;
  onSelect: (key: string) => void;
  /**
   * `primary` fills the selected chip with the ember, `accent` fills it with
   * the deep brown — for a second filter row sitting under a first, where two
   * ember rows would compete for the same "this is the choice" reading.
   */
  tone?: 'primary' | 'accent';
  /** Horizontal scroller, for an unbounded set. */
  scroll?: boolean;
  /**
   * Horizontal padding **inside** a scrolling row, in dp.
   *
   * A row that scrolls full-bleed needs its gutter here rather than on a parent
   * view: padding the parent stops the row at the gutter, so the last chip
   * cannot be dragged clear of the screen edge and always looks clipped.
   * Ignored when `scroll` is false, where the wrapping row is laid out by its
   * parent like anything else.
   */
  gutter?: number;
  testIDPrefix?: string;
}

export function MBFilterChips({
  options,
  selectedKey,
  onSelect,
  tone = 'primary',
  scroll = false,
  gutter,
  testIDPrefix,
}: MBFilterChipsProps): React.ReactElement {
  const theme = useTheme();
  /**
   * Fill and label move together.
   *
   * They used to be picked apart — the fill from `tone`, the label always
   * `onPrimary` — which was survivable while the brand fill and the brand mark
   * were both browns. Under v4 they are an ember and an ink, so an `accent`
   * chip filled with `accent` and labelled with `onPrimary` is ink on ink: a
   * selected chip with no visible label. A tone names a **pair**.
   */
  const [fill, label] =
    tone === 'accent'
      ? [theme.colors.secondary, theme.colors.onSecondary]
      : [theme.colors.primary, theme.colors.onPrimary];

  const chips = options.map(option => {
    const selected = option.key === selectedKey;
    const hasCount = option.count !== undefined;
    /* Spelled out rather than left to the reader assembling "Waiting" and "3"
       from two Texts, which it announces as a bare pair of words. */
    const name = option.accessibilityLabel ?? (hasCount ? `${option.label}, ${option.count}` : undefined);
    return (
      <MBPressable
        key={option.key}
        onPress={() => onSelect(option.key)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        {...(name ? { accessibilityLabel: name } : {})}
        {...(testIDPrefix ? { testID: `${testIDPrefix}-${option.key}` } : {})}
        style={[
          styles.chip,
          {
            // v4 draws a filter chip as a rounded rectangle, not a pill. The
            // distinction is doing work: the pill shape is reserved there for
            // *status* — a badge, an "Online" marker, a "Pending" tag, all of
            // which are read rather than tapped. A chip you choose between and
            // a tag that reports state should not be the same shape.
            borderRadius: theme.radius.sm,
            paddingHorizontal: theme.space.lg,
            backgroundColor: selected ? fill : theme.colors.surface,
            borderColor: selected ? fill : theme.colors.borderStrong,
            gap: theme.space.tight,
          },
        ]}>
        <Text
          style={[
            theme.type.label,
            { color: selected ? label : theme.colors.textSubtle },
          ]}>
          {option.label}
        </Text>
        {hasCount ? (
          /* A step down from the label, never a step up. The count is context
             for a choice, not the choice — and on a selected chip there is no
             muted level available anyway, because the only colour guaranteed
             legible on the fill is the one `tone` pairs with it. */
          <Text
            style={[
              theme.type.caption,
              { color: selected ? label : theme.colors.textMuted },
            ]}>
            {option.count}
          </Text>
        ) : null}
      </MBPressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, gutter ? { paddingHorizontal: gutter } : null]}>
        {chips}
      </ScrollView>
    );
  }

  return <View style={styles.wrap}>{chips}</View>;
}

const styles = StyleSheet.create({
  chip: {
    height: layout.chipH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  row: { gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
