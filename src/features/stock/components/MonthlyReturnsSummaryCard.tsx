import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BranchReturnsSummary, MonthlyReturnsSummary, ReturnsSummaryTotals } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, ErrorState, LoadingSkeleton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import {
  RETURNS_SUMMARY_STATUS_ORDER,
  RETURNS_SUMMARY_STATUS_TONE,
  buildReturnsSummaryTiles,
  formatReturnsWindow,
  unpricedNote,
  type ReturnsSummaryStatus,
  type ReturnsSummaryTone,
} from '../returnsSummary';

export interface MonthlyReturnsSummaryCardProps {
  summary: MonthlyReturnsSummary | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Each screen names the statuses its own way ("Awaiting Review" vs "Pending"). */
  statusLabels: Record<ReturnsSummaryStatus, string>;
  /** Production: one row per branch, plus an All Branches total. */
  showBranches?: boolean;
}

/**
 * The month-to-date Product Returns summary — the same server figures the web's
 * Return Stock and Production → Product Returns pages show, laid out for a
 * phone: a horizontally scrolling tile strip, then (Production only) a compact
 * per-branch list instead of the web's wide table.
 */
export function MonthlyReturnsSummaryCard({ summary, isLoading, error, onRetry, statusLabels, showBranches = false }: MonthlyReturnsSummaryCardProps) {
  const theme = useAppTheme();
  const toneColor: Record<ReturnsSummaryTone, string> = {
    neutral: theme.colors.text,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    info: theme.colors.info,
  };

  if (error && !summary) {
    return <ErrorState message={mapErrorToMessage(error)} onRetry={onRetry} />;
  }

  const totals = summary?.totals;
  const note = totals ? unpricedNote(totals) : null;

  return (
    <Card>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, letterSpacing: 1.2 }]}>MONTHLY RETURNS</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', marginTop: 2 }]}>
        {summary ? formatReturnsWindow(summary.from, summary.to) : 'This month'}
      </Text>

      {isLoading || !totals ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <LoadingSkeleton height={64} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: theme.spacing.sm }} contentContainerStyle={styles.row}>
          {buildReturnsSummaryTiles(totals, statusLabels).map((tile) => (
            <View
              key={tile.key}
              accessible
              accessibilityLabel={`${tile.label}: ${tile.value}, ${tile.sub}`}
              style={[styles.tile, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {tile.label}
              </Text>
              <Text style={[theme.typography.cardTitle, { color: toneColor[tile.tone], marginTop: 2 }]} numberOfLines={1}>
                {tile.value}
              </Text>
              <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 2 }]} numberOfLines={1}>
                {tile.sub}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {note ? <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: theme.spacing.sm }]}>{note}</Text> : null}

      {showBranches && summary && totals ? (
        <View style={{ marginTop: theme.spacing.md }}>
          {summary.branches.map((b) => (
            <BranchRow key={b.branchId} name={b.branchName} totals={b} statusLabels={statusLabels} toneColor={toneColor} />
          ))}
          {summary.branches.length > 1 ? (
            <BranchRow name="All Branches" totals={totals} statusLabels={statusLabels} toneColor={toneColor} emphasis />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function BranchRow({
  name,
  totals,
  statusLabels,
  toneColor,
  emphasis = false,
}: {
  name: string;
  totals: ReturnsSummaryTotals | BranchReturnsSummary;
  statusLabels: Record<ReturnsSummaryStatus, string>;
  toneColor: Record<ReturnsSummaryTone, string>;
  emphasis?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.branchRow, { borderTopColor: theme.colors.cardBorder, borderTopWidth: emphasis ? 2 : 1 }]}>
      <View style={styles.branchHead}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
          {name.replace('Mountain Bakes ', '')}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(totals.submitted.amount)}</Text>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {totals.submitted.qty.toLocaleString('en-US')} items · {totals.submitted.count} {totals.submitted.count === 1 ? 'transaction' : 'transactions'}
      </Text>
      <View style={styles.statusWrap}>
        {RETURNS_SUMMARY_STATUS_ORDER.map((s) => (
          <Text key={s} style={[theme.typography.label, { color: toneColor[RETURNS_SUMMARY_STATUS_TONE[s]] }]}>
            {statusLabels[s]} {totals[s].qty.toLocaleString('en-US')} · {formatCurrency(totals[s].amount)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { minWidth: 140, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  branchRow: { paddingVertical: 10 },
  branchHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2, marginTop: 4 },
});
