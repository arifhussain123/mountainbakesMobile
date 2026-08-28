import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBPressable } from './MBPressable';
import { useTheme } from '@/common/theme/ThemeProvider';

/**
 * A heading over a group of cards, with an optional link on the right.
 *
 * ---------------------------------------------------------------------------
 * Why the title sits outside the card
 * ---------------------------------------------------------------------------
 * Screens here used to open every card with an `h3` inside it — "Stock status",
 * "Breakdown", "Top products" — which makes each card a self-contained panel and
 * the screen a stack of panels. v4 lifts the heading out: the title labels a
 * *region*, and the card below it is one of possibly several things in that
 * region.
 *
 * The practical difference is that a region can hold more than one card without
 * repeating its own name, and a heading can carry an action ("View all") that
 * belongs to the group rather than to any single card. A heading printed inside
 * the first of three cards has to either be repeated or silently describe its
 * two neighbours as well.
 *
 * ---------------------------------------------------------------------------
 * The action is a link, not a button
 * ---------------------------------------------------------------------------
 * v4 draws it as brand-coloured text with no chrome, and that is the right
 * weight: it is a way to see more of what is already on screen, and giving it a
 * border or a fill would put a second call to action beside the screen's real
 * one. It is still a 48dp target via `hitSlop` — the text itself is 13pt and
 * would otherwise be a miss on a moving bus.
 */
export interface MBSectionHeaderProps {
  title: string;
  /** One short line under the title — a period, a count, a date range. */
  subtitle?: string;
  /** The trailing link's text. Requires `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
  /**
   * Overrides the link's accessible name. Use where "View all" is ambiguous out
   * of context — a reader lands on the link without having heard the title.
   */
  actionAccessibilityLabel?: string;
  testID?: string;
}

export function MBSectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionAccessibilityLabel,
  testID,
}: MBSectionHeaderProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={[styles.row, { gap: theme.space.md }]} testID={testID}>
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={[theme.type.h3, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <MBPressable
          onPress={onAction}
          hitSlop={14}
          accessibilityRole="link"
          accessibilityLabel={actionAccessibilityLabel ?? `${actionLabel}, ${title}`}
          testID={testID ? `${testID}-action` : undefined}>
          <Text style={[theme.type.label, { color: theme.colors.accent }]}>{actionLabel}</Text>
        </MBPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
