import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBHeroCard, type HeroStat } from '@/common/ui';
import { formatAmount, formatCurrency } from '@/common/utils/money';
import { space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

import type { ComparisonTotals } from '../hooks';

export interface NetCardProps {
  totals: ComparisonTotals;
  /** The previous period's margin, for direction. Null when it had no sales. */
  previousMargin: number | null;
  /** Average per bucket that has happened — "per week", "per day". */
  average: { sales: number; expenses: number };
  /** What a bucket is called in this range, singular: 'day', 'week', 'month'. */
  bucketNoun: string;
  /** Labels of the buckets that spent more than they took. */
  lossBuckets: readonly string[];
  /** The period, in words — "November so far". */
  periodLabel: string;
  currencySymbol?: string;
}

/**
 * Sales − expenses = net, and the two figures that say what to do about it.
 *
 * ---------------------------------------------------------------------------
 * The subtraction is shown, not just its answer
 * ---------------------------------------------------------------------------
 * A net figure on its own is a number to be believed or not. Putting both
 * operands under it as supporting stats makes it arithmetic the reader can
 * check against the two cards above — which is the whole reason the figures are
 * derived in one place rather than read from three.
 *
 * ---------------------------------------------------------------------------
 * "Spent per rupee taken" is the figure a manager can act on
 * ---------------------------------------------------------------------------
 * A margin percentage says how it ended up; the expense ratio says what it cost
 * to get there, in the units the person setting a budget actually uses. They are
 * the same fact from two directions and both are worth the room: one is how the
 * month is reported upward, the other is how it is managed.
 *
 * The margin is shown **against the previous period** — a margin with no
 * direction says very little, and it is a ratio, so it survives the comparison
 * being a shorter window in a way the totals would not.
 *
 * ---------------------------------------------------------------------------
 * Loss-making buckets are named
 * ---------------------------------------------------------------------------
 * Two bars a few pixels apart is exactly the comparison the eye gets wrong, and
 * a week that spent more than it took is the one thing on this screen that has
 * to be acted on. It gets a sentence rather than being left to be spotted.
 */
export function NetCard({
  totals,
  previousMargin,
  average,
  bucketNoun,
  lossBuckets,
  periodLabel,
  currencySymbol,
}: NetCardProps): React.ReactElement {
  const theme = useTheme();

  const stats: HeroStat[] = [
    { label: 'Sales', value: formatCurrency(totals.sales, currencySymbol) },
    { label: 'less Expenses', value: formatCurrency(totals.expenses, currencySymbol) },
    ...(totals.expenseRatio === null
      ? []
      : [
          {
            label: 'Spent per rupee taken',
            // Two decimals always: `0.7` and `0.70` read as different
            // precisions, and this is the figure someone sets a target against.
            value: `${currencySymbol ?? 'Rs.'} ${totals.expenseRatio.toFixed(2)}`,
          },
        ]),
    {
      label: `Avg / ${bucketNoun}`,
      value: formatCurrency(average.sales, currencySymbol),
    },
  ];

  return (
    <View style={styles.root}>
      <MBHeroCard
        caption={`Net · ${periodLabel}`}
        value={totals.net}
        {...(currencySymbol ? { currencySymbol } : {})}
        stats={stats}
        {...(totals.margin === null
          ? {}
          : { highlight: marginLine(totals.margin, previousMargin) })}
        testID="sve-net"
      />

      {lossBuckets.length > 0 ? (
        <Text
          accessibilityRole="alert"
          style={[theme.type.caption, styles.note, { color: theme.colors.warning }]}>
          {lossBuckets.length === 1
            ? `${lossBuckets[0]} spent more than it took.`
            : `${lossBuckets.slice(0, -1).join(', ')} and ${lossBuckets.at(-1)} each spent more than they took.`}
        </Text>
      ) : null}

      {/* Averages are per bucket that has HAPPENED. Saying so is cheap and
          stops the figure being read as a forecast for the whole period. */}
      <Text style={[theme.type.caption, styles.note, { color: theme.colors.textMuted }]}>
        Averages and totals cover the part of {periodLabel.toLowerCase()} that has
        happened. Spending averages {formatAmount(average.expenses)} per {bucketNoun}.
      </Text>
    </View>
  );
}

/**
 * `Margin 26% · was 24%`, or just the margin when there is nothing to compare.
 *
 * Percentage **points**, not a percentage change: a margin moving 24 → 26 is up
 * two points, and calling that "8% up" is the kind of true-but-useless figure
 * that gets repeated in a meeting.
 */
function marginLine(margin: number, previous: number | null): string {
  const now = `Margin ${margin.toFixed(0)}%`;
  if (previous === null) return now;
  return `${now} · was ${previous.toFixed(0)}%`;
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  note: { paddingHorizontal: space.xs },
});
