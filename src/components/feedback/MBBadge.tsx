import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export interface MBBadgeProps {
  count: number;
  /** `danger` for things that failed and need a person; `accent` for a queue. */
  tone?: 'accent' | 'danger';
  /**
   * Announced by the screen reader, e.g. "3 items need attention". Pass an
   * empty string when the surrounding control already announces the count —
   * the badge then hides from the reader rather than saying the number twice.
   */
  label: string;
}

/** Counts above this render as "99+" — the pill stops fitting the tab bar. */
const CAP = 99;

/**
 * A count badge.
 *
 * Renders nothing at zero. That is the contract that makes badges trustworthy:
 * a badge clears itself when the state behind it clears, so staff learn that a
 * badge always means there is something there. A badge that lingers at zero, or
 * shows a number nobody can reconcile, teaches people to ignore every badge in
 * the app — including the one that matters.
 */
export function MBBadge({ count, tone = 'accent', label }: MBBadgeProps): React.ReactElement | null {
  const theme = useTheme();
  if (count <= 0) return null;

  const text = count > CAP ? `${CAP}+` : String(count);
  const bg = tone === 'danger' ? theme.colors.danger : theme.colors.accent;

  return (
    <View
      accessible={label.length > 0}
      accessibilityElementsHidden={label.length === 0}
      importantForAccessibility={label.length === 0 ? 'no-hide-descendants' : 'yes'}
      accessibilityRole="text"
      accessibilityLabel={label || undefined}
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.space.xs + 2,
        },
      ]}>
      <Text
        allowFontScaling={false}
        style={[theme.type.caption, styles.text, { color: theme.colors.onPrimary }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed height with allowFontScaling off on the number: at the largest
  // dynamic-type setting a scaling badge grows taller than the tab bar itself.
  // The label the screen reader announces carries the meaning instead.
  pill: { minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700', lineHeight: 18 },
});
