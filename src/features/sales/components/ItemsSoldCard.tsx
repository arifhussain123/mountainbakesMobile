import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface ItemsSoldChip {
  key: string;
  /** Product name, e.g. "Cream Puff". */
  n: string;
  /** Quantity sold, already formatted (e.g. "× 12"). */
  q: string;
}

export interface ItemsSoldCardProps {
  totalUnits: number;
  totalProducts: number;
  chips: ItemsSoldChip[];
}

/**
 * Design `09 Sales` lines 450-453 — "ITEMS SOLD" card: `N units · M products`
 * header, then the `{{ slItems }}` wrapped chip row (product name + qty, qty in orange).
 */
export function ItemsSoldCard({ totalUnits, totalProducts, chips }: ItemsSoldCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg }]}>
      <View style={styles.headerRow}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, letterSpacing: 1.2 }]}>ITEMS SOLD</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{totalUnits}</Text> units · {totalProducts} products
        </Text>
      </View>
      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View key={chip.key} style={[styles.chip, { backgroundColor: theme.colors.border, borderRadius: theme.radii.sm }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>
              {chip.n} <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{chip.q}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chipRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 28, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
});
