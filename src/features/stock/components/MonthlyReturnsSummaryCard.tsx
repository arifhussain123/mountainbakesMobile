import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BranchReturnsSummary, MonthlyReturnsSummary, ProductReturnsLine, ReturnsSummaryTotals } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, ErrorState, Icon, LoadingSkeleton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import {
  RETURNS_SUMMARY_STATUS_ORDER,
  RETURNS_SUMMARY_STATUS_TONE,
  buildReturnsSummaryTiles,
  describeProductLine,
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
  /** Production: Branches Reporting, one row per branch, plus an All Branches total. */
  showBranches?: boolean;
}

/** Item-wise lines shown before "Show all" — a busy month can run to dozens of products. */
const PRODUCT_PREVIEW = 5;

/**
 * The month-to-date Product Returns summary — the same server figures the web's
 * Return Stock and Production → Product Returns pages show, laid out for a
 * phone: a horizontally scrolling tile strip, an item-wise list, then
 * (Production only) a per-branch list whose rows open onto that branch's
 * products, instead of the web's wide table.
 */
export function MonthlyReturnsSummaryCard({ summary, isLoading, error, onRetry, statusLabels, showBranches = false }: MonthlyReturnsSummaryCardProps) {
  const theme = useAppTheme();
  const [openBranch, setOpenBranch] = useState<string | null>(null);
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
      <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.textFaint }]}>MONTHLY RETURNS</Text>
      <Text style={[theme.typography.body, styles.bold, styles.mt2, { color: theme.colors.text }]}>
        {summary ? formatReturnsWindow(summary.from, summary.to) : 'This month'}
      </Text>

      {isLoading || !summary ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <LoadingSkeleton height={64} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: theme.spacing.sm }} contentContainerStyle={styles.row}>
          {buildReturnsSummaryTiles(summary, statusLabels, { showBranches }).map((tile) => (
            <View
              key={tile.key}
              accessible
              accessibilityLabel={`${tile.label}: ${tile.value}, ${tile.sub}`}
              style={[styles.tile, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {tile.label}
              </Text>
              <Text style={[theme.typography.cardTitle, styles.mt2, { color: toneColor[tile.tone] }]} numberOfLines={1}>
                {tile.value}
              </Text>
              <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.textFaint }]} numberOfLines={1}>
                {tile.sub}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {note ? <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: theme.spacing.sm }]}>{note}</Text> : null}

      {summary && !showBranches ? <ProductList title="Item-wise" lines={summary.products} /> : null}

      {showBranches && summary && totals ? (
        <View style={{ marginTop: theme.spacing.md }}>
          {summary.branches.map((b) => (
            <BranchRow
              key={b.branchId}
              name={b.branchName}
              totals={b}
              products={b.products}
              open={openBranch === b.branchId}
              onToggle={() => setOpenBranch(openBranch === b.branchId ? null : b.branchId)}
              statusLabels={statusLabels}
              toneColor={toneColor}
            />
          ))}
          {summary.branches.length > 1 ? (
            <BranchRow name="All Branches" totals={totals} statusLabels={statusLabels} toneColor={toneColor} emphasis />
          ) : null}
          <ProductList title="Item-wise, all branches" lines={summary.products} />
        </View>
      ) : null}
    </Card>
  );
}

function ProductList({ title, lines, nested = false }: { title?: string; lines: ProductReturnsLine[]; nested?: boolean }) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? lines : lines.slice(0, PRODUCT_PREVIEW);

  return (
    <View style={[nested ? styles.nested : { marginTop: theme.spacing.md }, nested && { borderLeftColor: theme.colors.cardBorder }]}>
      {title ? (
        <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.textFaint }]}>{title.toUpperCase()}</Text>
      ) : null}
      {lines.length === 0 ? (
        <Text style={[theme.typography.label, styles.mt4, { color: theme.colors.textSecondary }]}>No returns this month.</Text>
      ) : (
        shown.map((line) => (
          <View key={line.productId} style={styles.productRow}>
            <View style={styles.flex1}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]} numberOfLines={1}>
                {line.productName}
              </Text>
              <Text style={[theme.typography.label, { color: theme.colors.textFaint }]} numberOfLines={1}>
                {line.productCode ? `${line.productCode} · ` : ''}
                {line.count} {line.count === 1 ? 'return' : 'returns'}
              </Text>
            </View>
            <Text style={[theme.typography.bodySmall, styles.bold, { color: theme.colors.text }]}>{describeProductLine(line)}</Text>
          </View>
        ))
      )}
      {lines.length > PRODUCT_PREVIEW ? (
        <Pressable accessibilityRole="button" onPress={() => setExpanded(!expanded)} hitSlop={8}>
          <Text style={[theme.typography.label, styles.bold, styles.mt4, { color: theme.colors.primary }]}>
            {expanded ? 'Show fewer' : `Show all ${lines.length} products`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BranchRow({
  name,
  totals,
  products,
  open = false,
  onToggle,
  statusLabels,
  toneColor,
  emphasis = false,
}: {
  name: string;
  totals: ReturnsSummaryTotals | BranchReturnsSummary;
  products?: ProductReturnsLine[];
  open?: boolean;
  onToggle?: () => void;
  statusLabels: Record<ReturnsSummaryStatus, string>;
  toneColor: Record<ReturnsSummaryTone, string>;
  emphasis?: boolean;
}) {
  const theme = useAppTheme();
  const canOpen = !!onToggle && (products?.length ?? 0) > 0;
  return (
    <View style={[styles.branchRow, { borderTopColor: theme.colors.cardBorder, borderTopWidth: emphasis ? 2 : 1 }]}>
      <Pressable
        accessibilityRole={canOpen ? 'button' : undefined}
        accessibilityState={canOpen ? { expanded: open } : undefined}
        disabled={!canOpen}
        onPress={onToggle}>
        <View style={styles.branchHead}>
          {canOpen ? <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} color={theme.colors.textSecondary} /> : null}
          <Text style={[theme.typography.body, styles.bold, styles.flex1, { color: theme.colors.text }]} numberOfLines={1}>
            {name.replace('Mountain Bakes ', '')}
          </Text>
          <Text style={[theme.typography.body, styles.bold, { color: theme.colors.text }]}>{formatCurrency(totals.submitted.amount)}</Text>
        </View>
        <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.textSecondary }]}>
          {totals.submitted.qty.toLocaleString('en-US')} items · {totals.submitted.count} {totals.submitted.count === 1 ? 'transaction' : 'transactions'}
        </Text>
        <View style={styles.statusWrap}>
          {RETURNS_SUMMARY_STATUS_ORDER.map((s) => (
            <Text key={s} style={[theme.typography.label, { color: toneColor[RETURNS_SUMMARY_STATUS_TONE[s]] }]}>
              {statusLabels[s]} {totals[s].qty.toLocaleString('en-US')} · {formatCurrency(totals[s].amount)}
            </Text>
          ))}
        </View>
      </Pressable>
      {open && products ? <ProductList lines={products} nested /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { minWidth: 140, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  eyebrow: { letterSpacing: 1.2 },
  bold: { fontWeight: '700' },
  flex1: { flex: 1 },
  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  branchRow: { paddingVertical: 10 },
  branchHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2, marginTop: 4 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  nested: { marginTop: 8, paddingLeft: 10, borderLeftWidth: 2 },
});
