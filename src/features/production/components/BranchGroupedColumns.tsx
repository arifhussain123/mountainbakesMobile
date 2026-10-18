import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ProductionBranchSummaryRow } from '@/api';
import { useAppTheme } from '@/shared/theme';
import {
  BRANCH_GROUP_WIDTH,
  COLUMN_PLOT_HEIGHT,
  branchColumnLabel,
  columnHeight,
  columnScaleMax,
  dashboardChartColors,
  describeBranchColumns,
  shortBranchName,
} from '../dashboardColumns';

export interface BranchGroupedColumnsProps {
  /** Every active branch, highest demand first — drawn left to right in that order. */
  rows: ProductionBranchSummaryRow[];
  selectedId: string | null;
  /** Tapping a branch filters the dashboard to it (tapping it again clears). */
  onSelect: (branchId: string) => void;
}

const SERIES = [
  { key: 'demanded', label: 'Demanded', color: 'demand' },
  { key: 'delivered', label: 'Delivered', color: 'delivered' },
  { key: 'returned', label: 'Returned', color: 'returned' },
] as const;

const LABEL_ROOM = 18;

/**
 * The web dashboard's Branch-wise summary as upright columns: branches along
 * the bottom, each with its Demanded / Delivered / Returned columns side by
 * side, demand written above. Past what the screen holds the chart scrolls
 * sideways; the screen itself never does.
 */
export function BranchGroupedColumns({ rows, selectedId, onSelect }: BranchGroupedColumnsProps) {
  const theme = useAppTheme();
  const colors = dashboardChartColors(theme.isDark);
  const max = columnScaleMax(rows.flatMap((r) => [r.demanded, r.delivered, r.returned]));

  return (
    <View>
      <View style={styles.legend}>
        {SERIES.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors[s.color] }]} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {rows.map((row) => {
          const label = branchColumnLabel(row);
          const dimmed = !!selectedId && selectedId !== row.branchId;
          const selected = selectedId === row.branchId;
          const demandHeight = columnHeight(row.demanded, max);
          return (
            <Pressable
              key={row.branchId}
              testID={`branch-columns-${row.branchId}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={describeBranchColumns(row)}
              onPress={() => onSelect(row.branchId)}
              style={[styles.group, { width: BRANCH_GROUP_WIDTH, opacity: dimmed ? 0.3 : 1 }]}>
              <View style={[styles.plot, { height: COLUMN_PLOT_HEIGHT + LABEL_ROOM, borderBottomColor: theme.colors.border }]}>
                {label ? (
                  <Text style={[styles.valueLabel, { bottom: demandHeight + 3, color: theme.colors.text }]} numberOfLines={1}>
                    {label}
                  </Text>
                ) : null}
                <View style={styles.bars}>
                  {SERIES.map((s) => (
                    <View
                      key={s.key}
                      testID={`branch-column-${row.branchId}-${s.key}`}
                      style={[styles.bar, { height: columnHeight(row[s.key], max), backgroundColor: colors[s.color] }]}
                    />
                  ))}
                </View>
              </View>
              <Text
                style={[theme.typography.label, styles.name, { color: theme.colors.text, fontWeight: selected ? '700' : '500' }]}
                numberOfLines={2}>
                {shortBranchName(row.branchName)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 9, height: 9, borderRadius: 2 },
  row: { alignItems: 'flex-start' },
  group: { alignItems: 'center' },
  plot: { alignSelf: 'stretch', justifyContent: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth },
  valueLabel: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  bar: { width: 13, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  name: { marginTop: 6, textAlign: 'center', paddingHorizontal: 2 },
});
