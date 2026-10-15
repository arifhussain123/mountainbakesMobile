import { Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import type { ProductionHeatmap } from '@/api';

export interface ProductionHeatmapCardProps {
  heat: ProductionHeatmap;
  /** Which row to spotlight — the selected branch filter, or the busiest branch when none is picked. */
  branchId?: string | null;
}

/** The "Branch × product demand" heatmap (screen 01) — one branch's row, cells darker for larger orders. */
export function ProductionHeatmapCard({ heat, branchId }: ProductionHeatmapCardProps) {
  const theme = useAppTheme();
  const row = (branchId ? heat.rows.find((r) => r.branchId === branchId) : undefined) ?? heat.rows[0];
  if (!row || heat.products.length === 0) {
    return <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No branch demand yet this period.</Text>;
  }

  const max = Math.max(1, ...row.values);

  return (
    <View>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginBottom: 8 }]} numberOfLines={1}>
        {row.branchName}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        {heat.products.map((p, idx) => {
          const value = row.values[idx] ?? 0;
          const opacity = value > 0 ? 0.35 + 0.65 * (value / max) : 0.12;
          return (
            <View
              key={p.productId ?? p.productName}
              style={{
                width: '18.5%',
                borderRadius: 10,
                paddingVertical: 7,
                paddingHorizontal: 3,
                alignItems: 'center',
                backgroundColor: `rgba(255,107,53,${opacity})`,
              }}>
              <Text style={[theme.typography.body, { color: '#1C1917', fontWeight: '700' }]}>{value}</Text>
              <Text style={{ color: '#3A2A22', fontSize: 8, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                {p.productName}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
