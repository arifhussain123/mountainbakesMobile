import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { PackingUsageRow } from '@/api';

export interface PackingUsageCardProps {
  row: PackingUsageRow;
}

/** branchApp.md screen 23 — Packing tab: one (date, material) usage row. */
export function PackingUsageCard({ row }: PackingUsageCardProps) {
  const theme = useAppTheme();

  return (
    <Card style={{ marginBottom: 8 }}>
      <View style={styles.row}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
          {row.materialName}
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatDisplayDate(row.date)}</Text>
      </View>
      <View style={[styles.grid, { marginTop: 8 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Requested <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{row.requestedQty}</Text>
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Approved <Text style={{ color: theme.colors.success, fontWeight: '700' }}>{row.approvedQty}</Text>
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Delivered <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{row.deliveredQty}</Text>
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
