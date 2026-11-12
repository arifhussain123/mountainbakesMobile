import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { MonthlyDiscountSummary } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, ErrorState, InfoBanner, KpiTile, LoadingSkeleton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatCurrency, formatMonthToDateLine } from '@/shared/utils';
import {
  buildDiscountSummaryBoxes,
  formatDiscountWindow,
  formatStaleNotice,
  type DiscountSummaryBox,
} from '../discountSummary';

export interface MonthlyDiscountSummaryCardProps {
  summary: MonthlyDiscountSummary | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** A refetch is running — the Retry on a failed refresh is held off meanwhile. */
  isFetching?: boolean;
  /** React Query's `dataUpdatedAt`, named when a refresh fails. */
  updatedAt?: number;
  /** Production: one box per branch plus All Branches. */
  showBranches?: boolean;
}

/** From this width the boxes wrap into a grid; below it they scroll sideways. */
const WRAP_FROM = 600;

/**
 * The month-to-date Branch Discount summary — the same server figures the web's
 * Discounts pages show, laid out for a phone: a sideways-scrolling row of
 * branch boxes (a wrapping grid on a tablet), each with the branch name and its
 * approved Total Discount in separate sections. A failed refresh keeps the last
 * figures but says they may be out of date.
 */
export function MonthlyDiscountSummaryCard({
  summary,
  isLoading,
  error,
  onRetry,
  isFetching = false,
  updatedAt = 0,
  showBranches = false,
}: MonthlyDiscountSummaryCardProps) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();

  if (error && !summary) {
    return <ErrorState message={mapErrorToMessage(error)} onRetry={onRetry} />;
  }

  const stale = !!error && !!summary;

  if (!showBranches) {
    return <OwnBranchSummary summary={summary} isLoading={isLoading} stale={stale} updatedAt={updatedAt} isFetching={isFetching} onRetry={onRetry} />;
  }

  const boxes = summary ? buildDiscountSummaryBoxes(summary, { showBranches }) : [];
  const wrap = width >= WRAP_FROM;
  const renderBox = (b: DiscountSummaryBox) => (
    <View
      key={b.key}
      accessible
      accessibilityLabel={`${b.name}: total discount ${b.total}, ${b.approvedLine}${b.pendingLine ? `, ${b.pendingLine}` : ''}`}
      style={[
        styles.box,
        wrap && styles.boxWrap,
        { borderColor: b.emphasis ? theme.colors.primary : theme.colors.cardBorder, borderRadius: theme.radii.md, backgroundColor: theme.colors.cardFill },
      ]}>
      <View style={[styles.boxHead, { borderBottomColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.bodySmall, styles.bold, { color: theme.colors.text }]} numberOfLines={2}>
          {b.name}
        </Text>
      </View>
      <View style={styles.boxBody}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Total Discount</Text>
        <Text style={[theme.typography.cardTitle, styles.mt2, { color: theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {b.total}
        </Text>
        <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.textFaint }]} numberOfLines={1}>
          {b.approvedLine}
        </Text>
        {b.pendingLine ? (
          <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.warning }]} numberOfLines={2}>
            {b.pendingLine}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <Card>
      <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.textFaint }]}>MONTHLY DISCOUNT SUMMARY</Text>
      <Text style={[theme.typography.body, styles.bold, styles.mt2, { color: theme.colors.text }]}>
        {summary ? `Period: ${formatDiscountWindow(summary.from, summary.to)}` : 'This month'}
      </Text>
      {summary ? (
        <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.textSecondary }]}>
          {formatMonthToDateLine(summary.from)} · approved claims
        </Text>
      ) : null}

      {stale ? (
        <View accessibilityRole="alert" style={[styles.stale, { borderColor: theme.colors.warning, borderRadius: theme.radii.md, marginTop: theme.spacing.sm }]}>
          <Text style={[theme.typography.label, styles.flex1, { color: theme.colors.warning }]}>{formatStaleNotice(updatedAt)}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} disabled={isFetching} hitSlop={8}>
            <Text style={[theme.typography.label, styles.bold, { color: isFetching ? theme.colors.textFaint : theme.colors.primary }]}>
              {isFetching ? 'Retrying…' : 'Retry'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading || !summary ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <LoadingSkeleton height={96} />
        </View>
      ) : boxes.length === 0 ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
          {summary.branches.length === 0 ? 'No active branches.' : 'No branch discounts this month.'}
        </Text>
      ) : wrap ? (
        <View style={[styles.grid, stale && styles.dim, { marginTop: theme.spacing.sm }]}>{boxes.map(renderBox)}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[stale && styles.dim, { marginTop: theme.spacing.sm }]}
          contentContainerStyle={styles.row}>
          {boxes.map(renderBox)}
        </ScrollView>
      )}
    </Card>
  );
}

const claims = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'claim' : 'claims'}`;

/**
 * Branch → Discounts (redesign `14 Discounts`): the branch's own month as two
 * pastel kpi tiles — awaiting review and approved, each with its claim count.
 * Only branch roles reach this, so the branch never needs naming; the server
 * scopes `totals` to it. Pending is its own tile, never added into Approved.
 */
function OwnBranchSummary({
  summary,
  isLoading,
  stale,
  updatedAt,
  isFetching,
  onRetry,
}: {
  summary: MonthlyDiscountSummary | undefined;
  isLoading: boolean;
  stale: boolean;
  updatedAt: number;
  isFetching: boolean;
  onRetry: () => void;
}) {
  const theme = useAppTheme();
  const t = summary?.totals;
  return (
    <View style={styles.own}>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>
        {summary ? `This month · ${formatDiscountWindow(summary.from, summary.to)}` : 'This month'}
      </Text>
      {stale ? (
        <InfoBanner kind="warn">
          <Text style={[theme.typography.bodySmall, { color: theme.colors.warning }]}>{formatStaleNotice(updatedAt)}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} disabled={isFetching} hitSlop={8} style={styles.mt2}>
            <Text style={[theme.typography.label, styles.bold, { color: isFetching ? theme.colors.textFaint : theme.colors.primary }]}>
              {isFetching ? 'Retrying…' : 'Retry'}
            </Text>
          </Pressable>
        </InfoBanner>
      ) : null}
      {isLoading || !t ? (
        <LoadingSkeleton height={96} />
      ) : (
        <View style={[styles.grid2, stale && styles.dim]}>
          <KpiTile
            tone={0}
            label="Awaiting review"
            value={formatCurrency(t.pending.amount)}
            sub={claims(t.pending.count)}
            valueColor={theme.colors.warning}
          />
          <KpiTile tone={1} label="Approved" value={formatCurrency(t.approved.amount)} sub={claims(t.approved.count)} valueColor={theme.colors.success} />
        </View>
      )}
      {summary ? <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{formatMonthToDateLine(summary.from)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { letterSpacing: 1.2 },
  bold: { fontWeight: '700' },
  flex1: { flex: 1 },
  mt2: { marginTop: 2 },
  dim: { opacity: 0.6 },
  stale: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  box: { width: 168, borderWidth: 1, overflow: 'hidden' },
  boxWrap: { width: undefined, flexBasis: 170, flexGrow: 1 },
  boxHead: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  boxBody: { paddingHorizontal: 12, paddingVertical: 10 },
  own: { gap: 10 },
  grid2: { flexDirection: 'row', gap: 8 },
});
