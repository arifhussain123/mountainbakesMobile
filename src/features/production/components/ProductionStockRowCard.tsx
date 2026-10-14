import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import type { ProductionStockRow } from '@/api';

export interface ProductionStockRowCardProps {
  row: ProductionStockRow;
}

const STATUS_LABEL: Record<ProductionStockRow['status'], string> = {
  healthy: 'Healthy',
  low: 'Low',
  shortage: 'Shortage',
  out: 'Out',
};

const STATUS_VARIANT: Record<ProductionStockRow['status'], StatusVariant> = {
  healthy: 'success',
  low: 'warning',
  shortage: 'danger',
  out: 'neutral',
};

/** mountainbakesProduction.html screen 07 — one product's pool row. */
export function ProductionStockRowCard({ row }: ProductionStockRowCardProps) {
  const theme = useAppTheme();

  return (
    <Card style={{ marginBottom: 8 }}>
      <View style={styles.topRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {row.productName}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{row.stockCode}</Text>
        </View>
        <StatusBadge label={STATUS_LABEL[row.status] ?? row.status} variant={STATUS_VARIANT[row.status] ?? 'neutral'} />
      </View>
      <View style={[styles.statsRow, { borderTopColor: theme.colors.border }]}>
        <View style={styles.statCol}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>OPENING</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{row.opening}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PREPARED</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.success, fontWeight: '700' }]}>
            {row.preparedToday > 0 ? `+${row.preparedToday}` : row.preparedToday}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DEMAND</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, fontWeight: '700' }]}>{row.branchDemand}</Text>
        </View>
        <View style={[styles.statCol, { alignItems: 'flex-end' }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>BALANCE</Text>
          <Text style={[theme.typography.bodySmall, { color: row.balance < 0 ? theme.colors.danger : theme.colors.text, fontWeight: '700' }]}>
            {row.balance}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  statsRow: { flexDirection: 'row', marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  statCol: { flex: 1 },
});
