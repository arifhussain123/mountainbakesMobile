import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { HeroSurface } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface DailySaleHeroCardProps {
  /** e.g. "01–12 OCT" — the selected from/to range, short form. */
  rangeLabel: string;
  totalSale: number;
  companyShare: number;
  branchShare: number;
  cashOnTable: number;
}

/**
 * Redesign B21 — the violet "Total sale · <range>" hero: the window's total,
 * then Company share / Branch share / Cash on table in columns (white on
 * violet; Branch share in honey, the branch's own cut).
 */
export function DailySaleHeroCard({ rangeLabel, totalSale, companyShare, branchShare, cashOnTable }: DailySaleHeroCardProps) {
  const theme = useAppTheme();
  // White on the violet hero (light); the accent's own on-colour on dark mode's flat accent hero.
  const onHero = theme.isDark ? theme.colors.primaryText : '#FFFFFF';
  const honey = theme.isDark ? onHero : '#FFD36E';

  const cols = [
    { label: 'Company share', value: companyShare, color: onHero },
    { label: 'Branch share', value: branchShare, color: honey },
    { label: 'Cash on table', value: cashOnTable, color: onHero },
  ];

  return (
    <HeroSurface style={styles.card}>
      <Text style={[styles.eyebrow, { color: onHero, opacity: 0.8 }]}>Total sale · {rangeLabel}</Text>
      <Text style={[styles.value, { color: onHero }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(totalSale)}
      </Text>
      <View style={styles.grid}>
        {cols.map((c) => (
          <View key={c.label} style={styles.col}>
            <Text style={[styles.sm, { color: onHero, opacity: 0.84 }]} numberOfLines={1}>
              {c.label}
            </Text>
            <Text style={[styles.colValue, { color: c.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(c.value)}
            </Text>
          </View>
        ))}
      </View>
    </HeroSurface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  value: { fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', gap: 12, marginTop: 4 },
  col: { flex: 1, minWidth: 0, gap: 2 },
  sm: { fontSize: 13, lineHeight: 18 },
  colValue: { fontSize: 15, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
