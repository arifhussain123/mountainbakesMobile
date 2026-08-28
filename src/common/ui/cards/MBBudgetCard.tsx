import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MBCard } from '../common/MBCard';
import { MBMeter } from '../common/MBMeter';
import { MBMoney } from '../common/MBMoney';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';
import { formatCurrency, round2, toNumber } from '@/common/utils/money';

/**
 * Budget against actual, for one period.
 *
 * ---------------------------------------------------------------------------
 * The figures are real, and were arriving unread
 * ---------------------------------------------------------------------------
 * `branches.daily_budget / weekly_budget / monthly_budget` are columns on the
 * branch, and `GET /api/reports/summary` returns them as `budget` **whenever a
 * single branch is in scope** — which is every branch-manager request, since the
 * server scopes that role by JWT. The field has been on the response the whole
 * time and nothing on this client read it. v5 draws the card; this is it.
 *
 * `budget` is optional on `ReportSummary` for the usual reason — a shipped app
 * can be talking to an older API — and **absent is not zero**. A branch with no
 * budget set and a server that does not report one are different states, and
 * neither is "you have spent your whole allowance". The caller renders nothing
 * rather than a full bar; see `budgetForPeriod` below.
 *
 * ---------------------------------------------------------------------------
 * Over budget is a fact, not an alarm
 * ---------------------------------------------------------------------------
 * The difference is signed and the word changes with it — "Remaining" while
 * there is headroom, "Over" once there is not — because a red number with no
 * label is a figure someone has to work out the sign of. The meter clamps at
 * full rather than overflowing its track: a bar that could run past its own end
 * has no length that means anything.
 *
 * The tone follows the same rule as `MBMeter`'s own doc — the colour is never
 * the only place the state is reported. The word is there too.
 */

export interface MBBudgetCardProps {
  /** What a full bar means. Zero or absent means "no budget set" — see above. */
  budget: number;
  /** Spent, taken, or whatever the period actually did. */
  actual: number;
  /** The period this covers, e.g. "August" or "This week". */
  periodLabel: string;
  /** Tenant symbol from AppSettings; falls back to "Rs.". */
  currencySymbol?: string;
  testID?: string;
}

export function MBBudgetCard({
  budget,
  actual,
  periodLabel,
  currencySymbol,
  testID,
}: MBBudgetCardProps): React.ReactElement {
  const theme = useTheme();

  const target = toNumber(budget);
  const spent = toNumber(actual);
  const difference = round2(target - spent);
  const over = difference < 0;

  /**
   * One announcement for the whole card.
   *
   * The three figures below are a row of label/value pairs, which a reader
   * would otherwise walk one cell at a time — six stops for one sentence, and
   * the last of them a bare number whose sign the listener has to remember.
   */
  const spoken =
    `${periodLabel} budget ${formatCurrency(target, currencySymbol)}, ` +
    `actual ${formatCurrency(spent, currencySymbol)}, ` +
    `${over ? 'over by' : 'remaining'} ${formatCurrency(Math.abs(difference), currencySymbol)}`;

  return (
    <MBCard testID={testID} accessibilityLabel={spoken}>
      <View style={styles.head}>
        <Text style={[theme.type.cardTitle, { color: theme.colors.text }]}>Budget vs Actual</Text>
        {/* A tag, so it takes the pill shape — this reports which period the
            card is about rather than offering a choice between periods. */}
        <View
          style={[
            styles.tag,
            {
              backgroundColor: theme.colors.primarySoft,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.space.snug,
            },
          ]}>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{periodLabel}</Text>
        </View>
      </View>

      <View style={{ paddingTop: theme.space.md }}>
        {/* Hidden from the reader: the card's own label above already carries
            all three numbers, and a bar has nothing to add to them. */}
        <MBMeter value={spent} max={target} tone={over ? 'danger' : 'brand'} />
      </View>

      <View style={[styles.figures, { paddingTop: theme.space.md, gap: theme.space.md }]}>
        <Figure label="Budget" value={target} symbol={currencySymbol} align="flex-start" />
        <Figure
          label="Actual"
          value={spent}
          symbol={currencySymbol}
          align="center"
          color={theme.colors.accent}
        />
        <Figure
          label={over ? 'Over' : 'Remaining'}
          value={Math.abs(difference)}
          symbol={currencySymbol}
          align="flex-end"
          color={over ? theme.colors.danger : theme.colors.success}
        />
      </View>
    </MBCard>
  );
}

function Figure({
  label,
  value,
  symbol,
  align,
  color,
}: {
  label: string;
  value: number;
  symbol?: string;
  align: 'flex-start' | 'center' | 'flex-end';
  color?: string;
}): React.ReactElement {
  const theme = useTheme();
  return (
    // Hidden as a unit: the card speaks for all three, and a reader stopping on
    // each would read "Over" and the number as two unrelated things.
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.figure, { alignItems: align, gap: theme.space.hair }]}>
      <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <MBMoney value={value} size="sm" symbol={symbol} {...(color ? { color } : {})} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  tag: { paddingVertical: space.hair },
  figures: { flexDirection: 'row', justifyContent: 'space-between' },
  figure: { flex: 1 },
});
