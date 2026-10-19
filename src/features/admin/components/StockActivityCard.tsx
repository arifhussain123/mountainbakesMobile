import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, EmptyState, ErrorState, FilterChipRow, LoadingSkeleton, type FilterChipOption } from '@/shared/ui';
import { formatCount, formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import type { StockActivityTotals } from '../utils/stockActivity';

export type HistoryDays = '7' | '14' | '30';
export const HISTORY_RANGE_OPTIONS: FilterChipOption<HistoryDays>[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
];

export interface StockActivityRow {
  key: string;
  title: string;
  /** e.g. "from 2026-10-01" on a capped branch. */
  note?: string;
  figures: StockActivityTotals;
  emphasis?: boolean;
}

function Figure({ label, q, a, color, bold }: { label: string; q: number; a: number; color?: string; bold?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.cell}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: color ?? theme.colors.text, fontWeight: bold ? '700' : '600' }]}>{formatCount(q)}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{formatCurrency(a)}</Text>
    </View>
  );
}

function ActivityRowCard({ row }: { row: StockActivityRow }) {
  const theme = useAppTheme();
  const f = row.figures;
  return (
    <View
      style={[
        styles.row,
        { borderColor: row.emphasis ? theme.colors.primary : theme.colors.border, borderRadius: theme.radii.md },
      ]}>
      <View style={styles.rowHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: row.emphasis ? '700' : '600' }]}>{row.title}</Text>
          {row.note ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{row.note}</Text> : null}
        </View>
        <Text style={[theme.typography.bodySmall, { color: f.balanceQty < 0 ? theme.colors.danger : theme.colors.text, fontWeight: '700' }]}>
          {formatCount(f.balanceQty)} left · {formatCurrency(f.balanceAmount)}
        </Text>
      </View>
      <View style={styles.grid}>
        <Figure label="Previous Stock" q={f.openingQty} a={f.openingAmount} />
        <Figure label="New Stock" q={f.newQty} a={f.newAmount} color={f.newQty ? theme.colors.success : undefined} />
        <Figure label="Sold" q={f.soldQty} a={f.soldAmount} color={f.soldQty ? theme.colors.danger : undefined} />
        {f.otherQty === 0 ? (
          <View style={styles.cell}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Ret / Adj</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>—</Text>
          </View>
        ) : (
          <Figure label="Ret / Adj" q={f.otherQty} a={f.otherAmount} color={theme.colors.info} />
        )}
        <Figure
          label="Remaining Stock"
          q={f.balanceQty}
          a={f.balanceAmount}
          color={f.balanceQty < 0 ? theme.colors.danger : undefined}
          bold
        />
      </View>
    </View>
  );
}

export interface StockActivityCardProps {
  title: string;
  subtitle: string;
  days: HistoryDays;
  onDaysChange: (days: HistoryDays) => void;
  rows: StockActivityRow[];
  total?: StockActivityRow;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  emptyTitle: string;
  emptyMessage: string;
  footnote?: ReactNode;
}

/**
 * The web's per-day "Branch Stock History" and branch-wise "All Branches —
 * Stock Activity" cards in their phone shape: one card per row, each figure a
 * quantity over its value at current prices.
 */
export function StockActivityCard({
  title,
  subtitle,
  days,
  onDaysChange,
  rows,
  total,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyMessage,
  footnote,
}: StockActivityCardProps) {
  const theme = useAppTheme();
  return (
    <Card style={{ marginTop: theme.spacing.lg }}>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text>
      <View style={{ marginTop: 10 }}>
        <FilterChipRow options={HISTORY_RANGE_OPTIONS} value={days} onChange={onDaysChange} />
      </View>
      <View style={{ marginTop: 12, gap: 10 }}>
        {loading ? (
          <LoadingSkeleton height={160} />
        ) : error ? (
          <ErrorState message={mapErrorToMessage(error)} onRetry={onRetry} />
        ) : rows.length === 0 ? (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        ) : (
          <>
            {rows.map((r) => (
              <ActivityRowCard key={r.key} row={r} />
            ))}
            {total ? <ActivityRowCard row={total} /> : null}
          </>
        )}
      </View>
      {footnote && !loading && !error ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 10 }]}>{footnote}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, padding: 12 },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, marginTop: 10 },
  cell: { width: '33.33%', paddingRight: 6 },
});
