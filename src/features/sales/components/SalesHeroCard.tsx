import { StyleSheet, Text, View } from 'react-native';
import { HERO_CHIP, useAppTheme } from '@/shared/theme';
import { HeroSurface } from '@/shared/ui';

export interface SalesHeroCardProps {
  /** Grand total after discount — the big headline figure. */
  total: string;
  /** Gross = qty × rate, before discount. */
  gross: string;
  /** Total discount taken off list price, already signed for display (e.g. "− Rs. 50"). */
  discount: string;
}

/** Honey — the mockup's discount figure on the violet hero. */
const HONEY = '#FFD36E';

/**
 * Redesign `09 Sales` — the violet hero: "Total sales · after discount", the
 * big figure, then Gross (qty × rate) and Discount side by side.
 */
export function SalesHeroCard({ total, gross, discount }: SalesHeroCardProps) {
  const theme = useAppTheme();
  // White on the violet hero (light); the accent's own on-colour on dark mode's flat accent hero.
  const ink = theme.isDark ? theme.colors.primaryText : HERO_CHIP.text;
  const muted = theme.isDark ? theme.colors.primaryText : HERO_CHIP.textMuted;

  return (
    <HeroSurface style={styles.hero}>
      <Text style={[styles.eyebrow, { color: muted }]}>Total sales · after discount</Text>
      <Text style={[styles.amount, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {total}
      </Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={[styles.sm, { color: muted }]}>Gross (qty × rate)</Text>
          <Text style={[styles.value, { color: ink }]}>{gross}</Text>
        </View>
        <View style={styles.col}>
          <Text style={[styles.sm, { color: muted }]}>Discount</Text>
          <Text style={[styles.value, { color: theme.isDark ? ink : HONEY }]}>{discount}</Text>
        </View>
      </View>
    </HeroSurface>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12 },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  amount: { fontSize: 34, lineHeight: 40, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 24 },
  col: { gap: 2 },
  sm: { fontSize: 13, lineHeight: 18 },
  value: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
