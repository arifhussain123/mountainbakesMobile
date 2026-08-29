import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBCard, MBIcon, MBMoney } from '@/common/ui';
import { formatCurrency } from '@/common/utils/money';
import { radius } from '@/common/theme/radius';
import { space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

import type { Change } from '../hooks';

export interface SeriesCardsProps {
  sales: number;
  expenses: number;
  change: { sales: Change; expenses: Change } | null;
  /** "vs the same 5 days last month" — the window the change is against. */
  comparisonLabel: string;
  currencySymbol?: string;
}

/**
 * The two totals, each carrying its own series swatch.
 *
 * ---------------------------------------------------------------------------
 * The swatches are the chart's legend
 * ---------------------------------------------------------------------------
 * They are drawn from `theme.colors.series[0]` and `[1]` — the same two the
 * paired chart fills its columns with, read from the same place, so the card and
 * the bar under it cannot come to mean different things. That is what lets the
 * chart be read without a legend of its own.
 *
 * `colors.series` **is** this screen's series palette; there is no separate
 * constant and there must not be one. A hex at a call site would be correct in
 * exactly one colour scheme, which is what `npm run theme:check` exists to stop,
 * and it would bypass the ramp's asserted separation in `contrast.test.ts`.
 *
 * ---------------------------------------------------------------------------
 * Rising expenses and rising sales are not the same news
 * ---------------------------------------------------------------------------
 * The arrow is the same glyph on both cards and it means the opposite thing: up
 * is good on sales and bad on expenses. Colouring both by direction alone would
 * paint a month where spending jumped 40% in the same green as one where takings
 * did — which is not a subtle misreading, it is the wrong answer to "how are we
 * doing".
 *
 * The colour is never the only carrier: the figure and its sign are in the text,
 * and the accessible name says which way it went in words.
 */
export function SeriesCards({
  sales,
  expenses,
  change,
  comparisonLabel,
  currencySymbol,
}: SeriesCardsProps): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <SeriesCard
        label="Sales"
        value={sales}
        swatch={theme.colors.series[0]}
        {...(change ? { change: change.sales } : {})}
        comparisonLabel={comparisonLabel}
        {...(currencySymbol ? { currencySymbol } : {})}
        testID="series-sales"
      />
      <SeriesCard
        label="Expenses"
        value={expenses}
        swatch={theme.colors.series[1]}
        {...(change ? { change: change.expenses } : {})}
        comparisonLabel={comparisonLabel}
        {...(currencySymbol ? { currencySymbol } : {})}
        /* The whole reason this prop exists. */
        risingIsGood={false}
        testID="series-expenses"
      />
    </View>
  );
}

function SeriesCard({
  label,
  value,
  swatch,
  change,
  comparisonLabel,
  currencySymbol,
  risingIsGood = true,
  testID,
}: {
  label: string;
  value: number;
  swatch: string;
  change?: Change;
  comparisonLabel: string;
  currencySymbol?: string;
  risingIsGood?: boolean;
  testID: string;
}): React.ReactElement {
  const theme = useTheme();

  const direction = change === undefined ? 'flat' : change.delta > 0 ? 'up' : change.delta < 0 ? 'down' : 'flat';
  const good = direction === 'flat' ? null : (direction === 'up') === risingIsGood;
  const tone =
    good === null ? theme.colors.textMuted : good ? theme.colors.success : theme.colors.danger;
  const icon = direction === 'up' ? 'trendUp' : direction === 'down' ? 'trendDown' : 'trendFlat';

  return (
    <MBCard style={styles.card} testID={testID}>
      <View style={styles.head}>
        <View
          style={[styles.swatch, { backgroundColor: swatch, borderRadius: radius.xs }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>{label}</Text>
      </View>

      <MBMoney value={value} size="md" symbol={currencySymbol} />

      {change === undefined ? (
        /* Held rather than hidden: a card that grows a line when the comparison
           lands would reflow the pair under the reader's thumb. */
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Comparing…
        </Text>
      ) : (
        <View
          style={styles.change}
          accessible
          accessibilityLabel={spoken(label, direction, change, comparisonLabel, currencySymbol)}>
          <MBIcon name={icon} size="action" color={tone} />
          <Text style={[theme.type.caption, styles.changeText, { color: tone }]}>
            {change.pct === null
              ? `${formatCurrency(Math.abs(change.delta), currencySymbol)} ${comparisonLabel}`
              : `${Math.abs(change.pct).toFixed(0)}% ${comparisonLabel}`}
          </Text>
        </View>
      )}
    </MBCard>
  );
}

/**
 * The change in words.
 *
 * A reader who cannot see the arrow or the colour gets nothing from "40%" — and
 * on the expenses card the two carriers disagree with the naive reading, which
 * is exactly when the sentence has to be explicit.
 */
function spoken(
  label: string,
  direction: 'up' | 'down' | 'flat',
  change: Change,
  comparisonLabel: string,
  symbol?: string,
): string {
  if (direction === 'flat') return `${label} unchanged ${comparisonLabel}`;
  const size =
    change.pct === null
      ? formatCurrency(Math.abs(change.delta), symbol)
      : `${Math.abs(change.pct).toFixed(0)} per cent`;
  return `${label} ${direction} ${size} ${comparisonLabel}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  card: { flex: 1, gap: space.tight },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  swatch: { width: 10, height: 10 },
  change: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  changeText: { flex: 1 },
});
