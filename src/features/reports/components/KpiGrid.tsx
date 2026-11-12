import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme, type PastelTone } from '@/shared/theme';
import { Icon, PASTEL_INK, PastelTile, type IconName } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface KpiItem {
  id: string;
  label: string;
  value: string;
  icon: IconName;
  valueColor?: string;
  muted?: boolean;
  /** Only set for Revenue, from `sales_analytics`'s own aggregate comparison — no other KPI has previous-period data available (see calculations.ts). */
  delta?: { pct: number; direction: 'up' | 'down' | 'stable' };
}

export interface KpiGridProps {
  items: KpiItem[];
}

/**
 * The redesign's `kpi()` tiles in a 2-column grid — pastel gradient tiles
 * cycling mint / aqua / amber / lilac / pink in order (`.kpi:nth-child(5n+k)`),
 * navy text. Dark mode gets the ordinary glass card (PastelTile's fallback).
 * Also used by the Super Admin Reports and Daily Sale screens.
 */
export function KpiGrid({ items }: KpiGridProps) {
  const theme = useAppTheme();
  const muted = theme.isDark ? theme.colors.textSecondary : PASTEL_INK.muted;

  return (
    <View style={styles.grid}>
      {items.map((item, index) => (
        <PastelTile key={item.id} tone={(index % 5) as PastelTone} style={[styles.cell, { opacity: item.muted ? 0.6 : 1 }]}>
          <View style={styles.topRow}>
            <Text style={[styles.k, { color: muted }]} numberOfLines={1}>
              {item.label}
            </Text>
            <Icon name={item.icon} size={16} color={muted} />
          </View>
          <Text style={[styles.v, { color: item.valueColor ?? theme.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {item.value}
          </Text>
          {item.delta ? (
            <Text
              accessibilityLabel={`${item.delta.direction === 'up' ? 'up' : item.delta.direction === 'down' ? 'down' : 'flat'} ${Math.abs(item.delta.pct).toFixed(1)} percent vs previous period`}
              style={[
                styles.s,
                { color: item.delta.direction === 'down' ? theme.colors.danger : item.delta.direction === 'up' ? theme.colors.success : muted },
              ]}>
              {item.delta.direction === 'down' ? '▼' : item.delta.direction === 'up' ? '▲' : '–'} {Math.abs(item.delta.pct).toFixed(1)}% vs previous
            </Text>
          ) : null}
        </PastelTile>
      ))}
    </View>
  );
}

export function formatMoney(value: number): string {
  return formatCurrency(value);
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cell: { width: '48.2%', padding: 14, gap: 4, borderRadius: 24 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  k: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  v: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  s: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
});
