import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { getBusinessDate, useFinanceDailySales, type DepositReconStatus, type FinanceDailySaleRow } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, EmptyState, ErrorState, LoadingSkeleton, StatCard, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ATTENTION_LABELS, ATTENTION_ORDER, dayKey, findOutliers, needsAttention, OUTLIER_FACTOR } from '../../utils/branchSalesAttention';
import { shiftDate } from '../../utils/closingChecklist';
import { formatMoney2, moneyWords } from '../../utils/financeFormat';
import { styles } from './styles';

/**
 * Branches began handing their money over as cash deposits on this date; every
 * earlier day would read "Not received" for a deposit that never existed. Same
 * floor as the web tab (BranchSalesTab.tsx `DEPOSITS_START_DATE`).
 */
export const DEPOSITS_START_DATE = '2026-09-30';
/** Thirty business days ending today, as on the web. */
export const BRANCH_SALES_WINDOW_DAYS = 30;

export function branchSalesWindow(today: string = getBusinessDate()): { from: string; to: string } {
  const from = shiftDate(today, -(BRANCH_SALES_WINDOW_DAYS - 1));
  return { from: from < DEPOSITS_START_DATE ? DEPOSITS_START_DATE : from, to: today };
}

export const RECON_LABELS: Record<DepositReconStatus, string> = {
  nothing_due: 'Nothing due',
  not_received: 'Not received',
  pending: 'Awaiting approval',
  matched: 'Matched',
  discrepancy: 'Discrepancy',
};

const RECON_VARIANT: Record<DepositReconStatus, StatusVariant> = {
  nothing_due: 'neutral',
  not_received: 'danger',
  pending: 'warning',
  matched: 'success',
  discrepancy: 'danger',
};

/** "Rs. 1,200.00 short" / "Rs. 50.00 over" — the sign said in words, not only by colour. */
function differenceLabel(difference: number): string {
  if (difference === 0) return 'Rs. 0.00';
  return `${formatMoney2(Math.abs(difference))} ${difference > 0 ? 'short' : 'over'}`;
}

export function BranchSalesTab() {
  const theme = useAppTheme();
  const window = useMemo(() => branchSalesWindow(), []);
  const query = useFinanceDailySales(window);
  const listRef = useRef<FlatList<FinanceDailySaleRow>>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const rows = useMemo(
    () => [...(query.data?.records ?? [])].sort((a, b) => b.businessDate.localeCompare(a.businessDate) || a.branchName.localeCompare(b.branchName)),
    [query.data],
  );
  const outliers = useMemo(() => findOutliers(rows), [rows]);
  const attention = useMemo(() => needsAttention(rows), [rows]);
  const summary = query.data?.reconciliation;

  const jumpTo = (row: FinanceDailySaleRow) => {
    const index = rows.findIndex((r) => dayKey(r) === dayKey(row));
    if (index < 0) return;
    setFocused(dayKey(row));
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 });
  };

  const header = (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {formatDisplayDate(window.from)} to {formatDisplayDate(window.to)} · every branch · deposits are tracked from {formatDisplayDate(DEPOSITS_START_DATE)}
      </Text>
      {query.isLoading ? <LoadingSkeleton height={160} /> : null}
      {query.error ? <ErrorState message={mapErrorToMessage(query.error)} onRetry={() => void query.refetch()} /> : null}

      {summary ? (
        <Card style={{ marginTop: theme.spacing.md }}>
          <View style={styles.statsRow}>
            <StatCard label="Company Share" value={formatMoney2(summary.expected)} />
            <StatCard label="Received" value={formatMoney2(summary.received)} valueColor={theme.colors.success} />
          </View>
          <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
            <StatCard label="Awaiting Approval" value={formatMoney2(summary.pending)} valueColor={theme.colors.warning} />
            <StatCard label="Deposit Difference" value={differenceLabel(summary.difference)} valueColor={summary.difference > 0 ? theme.colors.danger : theme.colors.text} />
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
            {summary.counts.matched} matched · {summary.counts.pending} awaiting approval · {summary.counts.discrepancy} discrepancy · {summary.counts.not_received} not received
          </Text>
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Needs attention</Text>
          {ATTENTION_ORDER.map((kind) => {
            const list = attention[kind];
            return (
              <View key={kind} style={{ marginTop: theme.spacing.sm }}>
                <Text style={[theme.typography.label, { color: list.length ? theme.colors.warning : theme.colors.textSecondary }]}>
                  {ATTENTION_LABELS[kind].toUpperCase()} · {list.length}
                </Text>
                {list.length === 0 ? (
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>None</Text>
                ) : (
                  list.map((r) => (
                    <Pressable
                      key={`${kind}-${dayKey(r)}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${ATTENTION_LABELS[kind]}: ${r.branchName}, ${formatDisplayDate(r.businessDate)}. Opens its day card.`}
                      onPress={() => jumpTo(r)}
                      style={[styles.attentionRow, { borderColor: theme.colors.border }]}>
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                        {r.branchName} · {formatDisplayDate(r.businessDate)}
                      </Text>
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
                        {kind === 'outlier' ? formatMoney2(r.autoTotalSale) : differenceLabel(r.reconciliation.difference)}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            );
          })}
        </Card>
      ) : null}

      <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }]}>Branch days</Text>
    </View>
  );

  return (
    <FlatList
      ref={listRef}
      data={rows}
      keyExtractor={dayKey}
      contentContainerStyle={{ padding: theme.spacing.lg }}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
      ListHeaderComponent={header}
      onScrollToIndexFailed={({ index, averageItemLength }) =>
        listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: true })
      }
      ListEmptyComponent={!query.isLoading && !query.error ? <EmptyState title="No Branch Days" message="No branch recorded a sale in this window." /> : undefined}
      renderItem={({ item }) => {
        const recon = item.reconciliation;
        const isOutlier = outliers.has(dayKey(item));
        const isFocused = focused === dayKey(item);
        return (
          <Card
            style={[{ marginBottom: theme.spacing.sm }, isFocused ? { borderWidth: 2, borderColor: theme.colors.primary } : null]}
            accessible
            accessibilityLabel={
              `${item.branchName}, ${formatDisplayDate(item.businessDate)}. Total sale ${moneyWords(item.autoTotalSale)}. ` +
              `Company share ${moneyWords(item.companyShare)}, received ${moneyWords(recon.received)}. ` +
              `Deposit ${RECON_LABELS[recon.status]}${recon.difference ? `, ${differenceLabel(recon.difference)}` : ''}.` +
              (isOutlier ? ' Outlier sale.' : '')
            }>
            <View style={styles.row}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                {item.branchName}
              </Text>
              <StatusBadge label={RECON_LABELS[recon.status]} variant={RECON_VARIANT[recon.status]} />
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
              {formatDisplayDate(item.businessDate)} · {item.orderCount} orders{recon.provisional ? ' · provisional match' : ''}
            </Text>
            <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
              <StatCard label="Total Sale" value={formatMoney2(item.autoTotalSale)} />
              <StatCard label="Company Share" value={formatMoney2(item.companyShare)} />
            </View>
            <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
              <StatCard label="Received" value={formatMoney2(recon.received)} />
              <StatCard label="Deposit Difference" value={differenceLabel(recon.difference)} valueColor={recon.difference > 0 ? theme.colors.danger : theme.colors.text} />
            </View>
            {isOutlier ? (
              <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: theme.spacing.sm }]}>
                Outlier: over {OUTLIER_FACTOR}× this branch's usual day. Confirm the figure with the branch.
              </Text>
            ) : null}
            {recon.deposits.length > 0 ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
                Deposits: {recon.deposits.map((d) => `${d.transferNo} ${formatMoney2(d.amount)}${d.status === 'pending' ? ' (awaiting approval)' : ''}`).join(', ')}
              </Text>
            ) : null}
          </Card>
        );
      }}
    />
  );
}
