import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { MonthlyReturnsSummary } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, ErrorState, LoadingSkeleton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatMonthToDateLine } from '@/shared/utils';
import {
  buildBranchReturnBoxes,
  buildReturnsSummaryTiles,
  formatReturnsWindow,
  scopedReturnsTotals,
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
  /** Production: Branches Reporting, and one return-amount box per active branch. */
  showBranches?: boolean;
  /** Branch records — the boxes are the active ones, matched by id. */
  branches?: { id: string; name: string; isActive?: boolean }[];
  /** The branch the screen is narrowed to: its box is marked and the tiles show its figures. */
  selectedBranchId?: string | null;
  /** A box was tapped: its id, or null when the selected box is tapped again. */
  onSelectBranch?: (branchId: string | null) => void;
}

/**
 * The month-to-date Product Returns summary — the same server figures the web's
 * Return Stock and Production → Product Returns pages show, laid out for a
 * phone: a horizontally scrolling tile strip, then (Production) one box per
 * active branch with its monthly return amount — approved, awaiting review and
 * sent back; rejected excluded. The branch view is the tiles alone: the web
 * dropped its item-wise list there, and this follows it.
 */
export function MonthlyReturnsSummaryCard({
  summary,
  isLoading,
  error,
  onRetry,
  statusLabels,
  showBranches = false,
  branches,
  selectedBranchId = null,
  onSelectBranch,
}: MonthlyReturnsSummaryCardProps) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
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

  const totals = summary ? scopedReturnsTotals(summary, selectedBranchId) : undefined;
  const note = totals ? unpricedNote(totals) : null;
  const boxes = showBranches && summary && branches ? buildBranchReturnBoxes(summary, branches) : null;
  // Two boxes a row on a phone, more on a tablet.
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;

  return (
    <Card>
      <Text style={[theme.typography.label, styles.eyebrow, { color: theme.colors.textFaint }]}>MONTHLY RETURNS</Text>
      <Text style={[theme.typography.body, styles.bold, styles.mt2, { color: theme.colors.text }]}>
        {summary ? formatReturnsWindow(summary.from, summary.to) : 'This month'}
      </Text>
      {summary ? (
        <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.textSecondary }]}>{formatMonthToDateLine(summary.from)}</Text>
      ) : null}

      {isLoading || !summary ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <LoadingSkeleton height={64} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: theme.spacing.sm }} contentContainerStyle={styles.row}>
          {buildReturnsSummaryTiles(summary, statusLabels, { showBranches, branchId: selectedBranchId }).map((tile) => (
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


      {showBranches && summary ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.bodySmall, styles.bold, { color: theme.colors.text }]}>Monthly Return Amount by Branch</Text>
          <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.textFaint }]}>
            Active branches · {statusLabels.accepted.toLowerCase()}, {statusLabels.pending.toLowerCase()} and {statusLabels.returned.toLowerCase()} · {statusLabels.rejected.toLowerCase()} excluded
          </Text>
          {!boxes ? (
            <View style={{ marginTop: theme.spacing.sm }}>
              <LoadingSkeleton height={88} />
            </View>
          ) : boxes.length === 0 ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>No active branches.</Text>
          ) : (
            <View style={[styles.grid, { marginTop: theme.spacing.sm }]}>
              {boxes.map((b) => {
                const selected = b.branchId === selectedBranchId;
                return (
                  <View key={b.branchId} style={[styles.cell, { width: `${100 / columns}%` }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${b.name}: monthly return amount ${b.total}`}
                      disabled={!onSelectBranch}
                      onPress={() => onSelectBranch?.(selected ? null : b.branchId)}
                      style={[
                        styles.box,
                        {
                          borderRadius: theme.radii.md,
                          borderColor: selected ? theme.colors.primary : theme.colors.cardBorder,
                          backgroundColor: selected ? theme.colors.surface : theme.colors.cardFill,
                          borderWidth: selected ? 2 : 1,
                        },
                      ]}>
                      <Text style={[theme.typography.bodySmall, styles.bold, { color: theme.colors.text }]} numberOfLines={2}>
                        {b.name}
                      </Text>
                      <View style={[styles.boxAmount, { borderTopColor: theme.colors.cardBorder }]}>
                        <Text
                          style={[theme.typography.cardTitle, styles.bold, { color: b.amount === 0 ? theme.colors.textFaint : theme.colors.text }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}>
                          {b.total}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { minWidth: 140, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  eyebrow: { letterSpacing: 1.2 },
  bold: { fontWeight: '700' },
  mt2: { marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { padding: 6 },
  box: { flex: 1, minHeight: 88, justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  boxAmount: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
});
