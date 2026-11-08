import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDiscountDayCheck } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, ErrorState, Icon, LoadingSkeleton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';

export interface DiscountDayBreakdownProps {
  /** `production` reads any branch; `branch` reads the caller's own day (pinned on the server). */
  side: 'production' | 'branch';
  branchId: string;
  date: string;
}

/**
 * Discount detail → "Product breakdown — <date>", the same check the web's
 * Discounts → View dialog has on both the Production and Branch side: the
 * branch's till (POS) discounts for the claim's business day, one row per
 * product, against what the branch claimed for that day. A match shows green;
 * a gap shows Actual / Claimed / Difference in red. Collapsed until tapped, and
 * fetched only once opened.
 */
export function DiscountDayBreakdown({ side, branchId, date }: DiscountDayBreakdownProps) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const q = useDiscountDayCheck(side, branchId, date, open);
  const c = theme.colors;
  const divider = { borderTopWidth: 1, borderTopColor: c.border };

  return (
    <View style={{ marginTop: theme.spacing.lg }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={[styles.toggle, { borderColor: c.border, backgroundColor: c.surface }]}>
        <Icon name="list-indent" size={16} color={c.primary} />
        <Text style={[theme.typography.body, { color: c.text, fontWeight: '600', flex: 1 }]}>
          Product breakdown — {formatDisplayDate(date)}
        </Text>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={16} color={c.textSecondary} />
      </Pressable>

      {open ? (
        q.isLoading ? (
          <View style={{ marginTop: theme.spacing.sm }}>
            <LoadingSkeleton height={160} />
          </View>
        ) : q.error || !q.data ? (
          <ErrorState message={q.error ? mapErrorToMessage(q.error) : 'Could not load the product breakdown.'} onRetry={() => void q.refetch()} />
        ) : (
          <View>
            <Text style={[theme.typography.bodySmall, { color: c.textSecondary, marginTop: theme.spacing.sm }]}>
              Discounts given at the till on this day
            </Text>
            <Card style={{ marginTop: theme.spacing.sm }}>
              <View style={styles.row}>
                <Text style={[theme.typography.label, styles.name, { color: c.textSecondary }]}>PRODUCT</Text>
                <Text style={[theme.typography.label, styles.qty, { color: c.textSecondary }]}>QTY</Text>
                <Text style={[theme.typography.label, styles.amount, { color: c.textSecondary }]}>DISCOUNT</Text>
              </View>
              {q.data.products.length === 0 ? (
                <Text style={[theme.typography.bodySmall, { color: c.textSecondary, paddingVertical: 12, textAlign: 'center' }, divider]}>
                  No discounts were given at the till on this day.
                </Text>
              ) : (
                q.data.products.map((p) => (
                  <View key={p.productId ?? `name:${p.productName}`} style={[styles.row, divider]}>
                    <Text style={[theme.typography.bodySmall, styles.name, { color: c.text, fontWeight: '600' }]}>{p.productName}</Text>
                    <Text style={[theme.typography.bodySmall, styles.qty, { color: c.text }]}>{p.qty.toLocaleString()}</Text>
                    <Text style={[theme.typography.bodySmall, styles.amount, { color: c.text }]}>{formatCurrency(p.discount)}</Text>
                  </View>
                ))
              )}
              <View style={[styles.row, divider]}>
                <Text style={[theme.typography.body, styles.name, { color: c.text, fontWeight: '700' }]}>Total</Text>
                <Text style={[theme.typography.body, styles.amount, { color: c.text, fontWeight: '700' }]}>{formatCurrency(q.data.actualTotal)}</Text>
              </View>
            </Card>

            {q.data.matches ? (
              <View style={[styles.banner, { borderColor: c.success, backgroundColor: `${c.success}1A` }]}>
                <Icon name="check" size={16} color={c.success} />
                <Text style={[theme.typography.bodySmall, { color: c.success, flex: 1, fontWeight: '600' }]}>
                  Claimed amount matches the till: {formatCurrency(q.data.claimedTotal)}
                </Text>
              </View>
            ) : (
              <View style={[styles.banner, styles.bannerColumn, { borderColor: c.danger, backgroundColor: `${c.danger}1A` }]}>
                <Text style={[theme.typography.body, { color: c.danger, fontWeight: '700' }]}>Claimed amount does not match the till</Text>
                {(
                  [
                    ['Actual amount', formatCurrency(q.data.actualTotal)],
                    ['Claimed amount', formatCurrency(q.data.claimedTotal)],
                    ['Difference amount', `${q.data.difference > 0 ? '+' : ''}${formatCurrency(q.data.difference)}`],
                  ] as const
                ).map(([label, value]) => (
                  <View key={label} style={styles.figure}>
                    <Text style={[theme.typography.bodySmall, { color: c.danger }]}>{label}</Text>
                    <Text style={[theme.typography.bodySmall, { color: c.danger, fontWeight: '700' }]}>{value}</Text>
                  </View>
                ))}
                <Text style={[theme.typography.label, { color: c.danger }]}>
                  {q.data.difference > 0 ? 'The branch claimed more than the till gave away.' : 'The branch claimed less than the till gave away.'}
                </Text>
              </View>
            )}

            {q.data.claims.length > 1 ? (
              <Text style={[theme.typography.label, { color: c.textSecondary, marginTop: theme.spacing.sm }]}>
                Claimed amount is the total of {q.data.claims.length} claims for this day:{' '}
                {q.data.claims.map((cl) => `${cl.demandNumber ?? '—'} ${formatCurrency(cl.amount)}`).join(', ')}. Rejected claims are not counted.
              </Text>
            ) : null}
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  name: { flex: 1 },
  qty: { width: 44, textAlign: 'right' },
  amount: { width: 96, textAlign: 'right' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  bannerColumn: { flexDirection: 'column', alignItems: 'stretch', gap: 4 },
  figure: { flexDirection: 'row', justifyContent: 'space-between' },
});
