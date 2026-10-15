import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface SalesHeroCardProps {
  /** Grand total after discount — the big headline figure. */
  total: string;
  /** Gross = qty × rate, before discount. */
  gross: string;
  /** Total discount taken off list price. */
  discount: string;
}

/**
 * Design `09 Sales` lines 442-447 — the orange "TOTAL SALES" hero card with two
 * nested dark tiles (Gross / Discount) inside it. Not a generic `StatCard` row:
 * this is its own filled-orange shape, so it gets a dedicated component.
 */
export function SalesHeroCard({ total, gross, discount }: SalesHeroCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.hero, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg }]}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>TOTAL SALES</Text>
        <Text style={styles.eyebrow}>CHARGED, AFTER DISCOUNT</Text>
      </View>
      <Text style={styles.amount}>{total}</Text>
      <View style={styles.tileRow}>
        {/* Design's hard-coded `#1C1917` tile fill — a fixed dark chip inside the
            orange hero card, not a theme-driven surface (the app has one dark
            theme, so this matches `useAppTheme()` in practice too). */}
        <View style={[styles.tile, { backgroundColor: '#1C1917', borderRadius: theme.radii.md }]}>
          <Text style={styles.tileLabel}>Gross (qty × rate)</Text>
          <Text style={styles.tileValue}>{gross}</Text>
          <Text style={styles.tileSub}>Before discount</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: '#1C1917', borderRadius: theme.radii.md }]}>
          <Text style={styles.tileLabel}>Discount</Text>
          <Text style={styles.tileValue}>{discount}</Text>
          <Text style={styles.tileSub}>Off list price</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: '#FFFFFF' },
  amount: { marginTop: 8, fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  tileRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  tile: { flex: 1, paddingHorizontal: 12, paddingVertical: 9 },
  tileLabel: { fontSize: 11, fontWeight: '600', color: '#A39A92' },
  tileValue: { marginTop: 2, fontSize: 15, fontWeight: '700', color: '#F5F1EC' },
  tileSub: { fontSize: 10, fontWeight: '500', color: '#F5F1EC', opacity: 0.75 },
});
