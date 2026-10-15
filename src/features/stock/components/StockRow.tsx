import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import type { StockRow as StockRowData } from '@/api';

export interface StockRowProps {
  row: StockRowData;
}

export function StockRow({ row }: StockRowProps) {
  const theme = useAppTheme();

  return (
    <Card style={{ marginBottom: 8 }}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {row.productName}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{row.stockCode}</Text>
        </View>
        <Text style={[theme.typography.kpi, { color: row.balance > 0 ? theme.colors.text : theme.colors.textSecondary }]}>{row.balance}</Text>
      </View>
      <View style={[styles.grid, { marginTop: 10 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Open <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{row.opening}</Text>
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          New <Text style={{ color: theme.colors.success, fontWeight: '700' }}>+{row.newQty}</Text>
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Sold <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>-{row.sold}</Text>
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Ret <Text style={{ color: theme.colors.warning, fontWeight: '700' }}>{row.returned}</Text>
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Adj <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{row.adjustment >= 0 ? `+${row.adjustment}` : row.adjustment}</Text>
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
