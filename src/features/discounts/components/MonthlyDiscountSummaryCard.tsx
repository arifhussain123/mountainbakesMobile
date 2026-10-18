import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { MonthlyDiscountSummary } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, ErrorState, LoadingSkeleton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatMonthToDateLine } from '@/shared/utils';
import {
  buildDiscountSummaryBoxes,
  buildOwnBranchDiscountTotal,
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
      ) : !showBranches ? (
        <OwnBranchTotal summary={summary} dim={stale} />
      ) : boxes.length === 0 ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>No active branches.</Text>
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

/**
 * Branch → Discounts: the branch's own month as one full-width total, laid out
 * like Shop Expenses' total card — the web's `OwnBranchSummary`. Only branch
 * roles reach this screen, so the branch never needs naming.
 */
function OwnBranchTotal({ summary, dim }: { summary: MonthlyDiscountSummary; dim: boolean }) {
  const theme = useAppTheme();
  const t = buildOwnBranchDiscountTotal(summary);
  return (
    <View
      accessible
      accessibilityLabel={`${t.label}: ${t.total}. ${t.approvedLine}${t.pendingLine ? `. ${t.pendingLine}` : ''}`}
      style={[styles.ownTotal, dim && styles.dim, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg, marginTop: theme.spacing.sm }]}>
      <Text style={[theme.typography.label, { color: theme.colors.primaryText }]}>{t.label.toUpperCase()}</Text>
      <Text style={[theme.typography.screenTitle, { color: theme.colors.primaryText, marginTop: 4 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {t.total}
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.primaryText, marginTop: 4 }]}>{t.approvedLine}</Text>
      {t.pendingLine ? (
        <Text style={[theme.typography.label, styles.bold, { color: theme.colors.primaryText, marginTop: 2 }]}>{t.pendingLine}</Text>
      ) : null}
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
  ownTotal: { padding: 16 },
});
