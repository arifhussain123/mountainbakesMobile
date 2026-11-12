import { StyleSheet, Text, View } from 'react-native';
import { HERO_CHIP, useAppTheme } from '@/shared/theme';
import { HeroSurface, Icon } from '@/shared/ui';
import { formatCount, formatCurrency } from '@/shared/utils';
import { dashType } from './dashType';

export interface HeroSalesCardProps {
  /** e.g. "Today", "This Week", "This Month" — the active period label. */
  periodLabel: string;
  sales: number;
  netAmount: number;
  orders: number;
  /** `summary.averageOrderValue` — the server's own figure. */
  averageOrder: number;
  /**
   * The previous-period comparison pill ("+8.4% vs previous period"), only
   * when the Compare toggle is on and the server sent a change — never faked.
   */
  comparison?: { label: string; direction: 'up' | 'down' | 'stable' } | null;
}

/**
 * Redesign B03 — the violet "Sales · today" hero: the big sales figure with
 * Net (sales − expenses), Orders and Avg order in a row underneath.
 */
export function HeroSalesCard({ periodLabel, sales, netAmount, orders, averageOrder, comparison }: HeroSalesCardProps) {
  const theme = useAppTheme();
  // White on the violet hero (light); the accent's own on-colour on dark mode's flat accent hero.
  const onHero = theme.isDark ? theme.colors.primaryText : '#FFFFFF';
  const muted = theme.isDark ? theme.colors.primaryText : HERO_CHIP.textMuted;

  const stats = [
    { id: 'net', label: 'Net (sales − expenses)', value: formatCurrency(netAmount, 'netAmount') },
    { id: 'orders', label: 'Orders', value: formatCount(orders, 'orders') },
    { id: 'avg', label: 'Avg order', value: formatCurrency(averageOrder, 'averageOrderValue') },
  ];

  return (
    <HeroSurface style={styles.card}>
      <View style={styles.eyebrowRow}>
        <Text style={[dashType.eyebrow, { color: muted }]}>Sales · {periodLabel.toLowerCase()}</Text>
        {comparison ? (
          <View style={[styles.pill, { backgroundColor: HERO_CHIP.fill }]}>
            {comparison.direction !== 'stable' ? (
              <Icon name={comparison.direction === 'down' ? 'trending-down' : 'trending-up'} size={12} color={onHero} />
            ) : null}
            <Text style={[styles.pillText, { color: onHero }]} numberOfLines={1}>
              {comparison.label}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.big, { color: onHero }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {formatCurrency(sales, 'sales')}
      </Text>
      <View style={styles.row}>
        {stats.map((s) => (
          <View key={s.id} style={styles.stat}>
            <Text style={[dashType.sm, { color: muted, opacity: theme.isDark ? 0.8 : 1 }]} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={[styles.statValue, { color: onHero }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {s.value}
            </Text>
          </View>
        ))}
      </View>
    </HeroSurface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 24 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 24, paddingHorizontal: 10, borderRadius: 12, flexShrink: 1 },
  pillText: { fontSize: 11, fontWeight: '600' },
  big: { fontSize: 36, lineHeight: 42, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 16 },
  stat: { flexShrink: 1, minWidth: 0, gap: 2 },
  statValue: { fontSize: 16, lineHeight: 21, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
