import { StyleSheet, Text, View } from 'react-native';
import { HERO_CHIP } from '@/shared/theme';
import { HeroSurface } from '@/shared/ui';

export interface ReportsHeroProps {
  revenue: string;
  totalOrders: number;
  net: string;
  expenses: string;
  /** Revenue vs the previous period, from `sales_analytics`' own comparison — omitted when the server has none. */
  delta?: { pct: number; direction: 'up' | 'down' | 'stable' };
}

/**
 * 2026 redesign B23 — the violet hero: "Revenue · N orders" eyebrow, the
 * revenue figure, and Net (sales − expenses) / Expenses underneath.
 */
export function ReportsHero({ revenue, totalOrders, net, expenses, delta }: ReportsHeroProps) {
  // White on the violet hero (light); the accent's on-colour on dark mode's flat accent hero.
  const onHero = '#FFFFFF';
  const muted = HERO_CHIP.textMuted;

  return (
    <HeroSurface style={styles.hero}>
      <Text style={[styles.eyebrow, { color: muted }]}>
        Revenue · {totalOrders} {totalOrders === 1 ? 'order' : 'orders'}
      </Text>
      <Text style={[styles.value, { color: onHero }]} numberOfLines={1} adjustsFontSizeToFit>
        {revenue}
      </Text>
      {delta ? (
        <View
          accessibilityLabel={`${delta.direction === 'up' ? 'up' : delta.direction === 'down' ? 'down' : 'flat'} ${Math.abs(delta.pct).toFixed(1)} percent vs previous period`}
          style={[styles.chip, { backgroundColor: HERO_CHIP.fill, borderColor: HERO_CHIP.border }]}>
          <Text style={[styles.chipText, { color: onHero }]}>
            {delta.direction === 'down' ? '▼' : delta.direction === 'up' ? '▲' : '–'} {Math.abs(delta.pct).toFixed(1)}% vs previous
          </Text>
        </View>
      ) : null}
      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={[styles.sm, { color: muted }]} numberOfLines={1}>
            Net (sales − expenses)
          </Text>
          <Text style={[styles.sub, { color: onHero }]} numberOfLines={1}>
            {net}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={[styles.sm, { color: muted }]} numberOfLines={1}>
            Expenses
          </Text>
          <Text style={[styles.sub, { color: onHero }]} numberOfLines={1}>
            {expenses}
          </Text>
        </View>
      </View>
    </HeroSurface>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, gap: 4 },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  value: { fontSize: 34, lineHeight: 40, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'], paddingRight: 56 },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  chipText: { fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cell: { flex: 1, minWidth: 0, gap: 2 },
  sm: { fontSize: 13, lineHeight: 18 },
  sub: { fontSize: 15, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
