import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatPercent } from '@/shared/utils';
import type { ProductionPlanRow } from '@/api';
import { FilterChip } from './FilterChip';

export interface ProductionPlanListProps {
  rows: ProductionPlanRow[];
}

const FILTERS = ['all', 'short', 'onTrack'] as const;
const FILTER_LABEL: Record<(typeof FILTERS)[number], string> = { all: 'All', short: 'Short', onTrack: 'On Track' };

/**
 * The "Production plan" section (screen 01): demand vs. produced-plus-stock,
 * per product, with a coverage bar. `balance = (produced + stock) − demand` —
 * everything this product currently has to meet the demand it's actually
 * seeing, not a fabricated target.
 */
export function ProductionPlanList({ rows }: ProductionPlanListProps) {
  const theme = useAppTheme();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const computed = useMemo(
    () =>
      rows.map((r) => {
        const balance = r.produced + r.stock - r.demand;
        const coverage = r.demand > 0 ? Math.round(((r.produced + r.stock) / r.demand) * 100) : 100;
        return { ...r, balance, coverage, short: balance < 0 };
      }),
    [rows],
  );

  const filtered = computed.filter((r) => (filter === 'short' ? r.short : filter === 'onTrack' ? !r.short : true));

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {FILTERS.map((f) => (
            <FilterChip key={f} label={FILTER_LABEL[f]} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>
      </ScrollView>

      <View style={{ marginTop: 8 }}>
        {filtered.map((row) => (
          <View key={row.productId ?? row.productName} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
                {row.productName}
              </Text>
              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 9,
                  backgroundColor: row.short ? 'rgba(255,90,95,0.15)' : 'rgba(52,195,138,0.15)',
                }}>
                <Text style={[theme.typography.label, { color: row.short ? theme.colors.danger : theme.colors.success }]}>
                  {row.short ? 'Short' : 'On Track'}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 6, flexDirection: 'row', gap: 6 }}>
              {[
                { label: 'DEMAND', value: row.demand },
                { label: 'PRODUCED', value: row.produced },
                { label: 'IN STOCK', value: row.stock },
                { label: 'BALANCE', value: row.balance, color: row.short ? theme.colors.danger : theme.colors.success },
              ].map((cell) => (
                <View key={cell.label} style={{ flex: 1 }}>
                  <Text style={[theme.typography.label, { color: theme.colors.textFaint, fontSize: 9 }]}>{cell.label}</Text>
                  <Text style={[theme.typography.body, { color: cell.color ?? theme.colors.text, fontWeight: '700' }]}>{cell.value}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: theme.colors.border }}>
                <View
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    width: `${Math.min(100, Math.max(2, row.coverage))}%`,
                    backgroundColor: row.short ? theme.colors.danger : theme.colors.success,
                  }}
                />
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{formatPercent(row.coverage, 'plan.coverage', { digits: 0 })}</Text>
            </View>
          </View>
        ))}
        {filtered.length === 0 ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 12 }]}>
            No products in this filter.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
