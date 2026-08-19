import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBCard } from '../common/MBCard';
import { MBMoney } from '../common/MBMoney';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';
import type { Expense } from '@/shared/types/expense.types';

/**
 * One expense in a list.
 *
 * ---------------------------------------------------------------------------
 * One card, two screens
 * ---------------------------------------------------------------------------
 * This existed twice — `ExpenseCard` on the branch screen and `ExpenseRow` on
 * the admin one — with the same card, the same header row, the same description
 * and meta lines drawn from the same fields in a different order. They had
 * already drifted: the branch card showed the expense number and who filed it,
 * the admin card showed the branch and dropped both, and neither showed
 * everything a reader might need.
 *
 * The union is what ships, because every one of those fields answers a real
 * question and an absent one simply does not render. A super admin reading a
 * branch's expenses wants the branch AND who entered it; a branch manager
 * reading their own wants the reference number to quote.
 *
 * ---------------------------------------------------------------------------
 * `date` is the business date
 * ---------------------------------------------------------------------------
 * Not `createdAt`. An expense entered at 01:00 belongs to the evening it was
 * spent — the business day rolls at 02:00 Karachi — and showing the wall clock
 * instead would file it on the wrong day on screen while the server has it on
 * the right one. See `docs/timezone.md`.
 *
 * Once a list can span 30 days the date stops being implied by the screen, and
 * on a shared branch phone "who entered this" is the first question asked about
 * an expense nobody recognises.
 */

export interface MBExpenseCardProps {
  expense: Expense;
  /** Tenant symbol from AppSettings; `MBMoney` falls back to "Rs.". */
  currencySymbol?: string;
}

export const MBExpenseCard = React.memo(function MBExpenseCardView({
  expense,
  currencySymbol,
}: MBExpenseCardProps): React.ReactElement {
  const theme = useTheme();

  // Joined rather than interpolated so an absent field leaves no orphan
  // separator — "cash · " with nothing after it reads as missing data.
  const audit = [expense.date, expense.createdByName, expense.branchName]
    .filter(Boolean)
    .join(' · ');

  return (
    <MBCard>
      <View style={styles.top}>
        <View style={styles.main}>
          <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]} numberOfLines={1}>
            {expense.category}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {expense.description}
          </Text>
        </View>
        <MBMoney value={expense.amount} symbol={currencySymbol} />
      </View>

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {[expense.paymentMethod, expense.expenseNumber].filter(Boolean).join(' · ')}
      </Text>

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{audit}</Text>
    </MBCard>
  );
});

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  main: { flex: 1, gap: space.tight },
});
