import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface PaymentMethodTile {
  key: string;
  label: string;
  value: string;
  dotColor: string;
}

export interface PaymentMethodTileGridProps {
  tiles: PaymentMethodTile[];
}

/**
 * Design `09 Sales` lines 448-449 — the `{{ slPay }}` 2x2 tile grid: a
 * color-coded dot + label, then the big value, one tile per payment method.
 */
export function PaymentMethodTileGrid({ tiles }: PaymentMethodTileGridProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View
          key={tile.key}
          style={[styles.tile, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
          <View style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: tile.dotColor }]} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {tile.label}
            </Text>
          </View>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 4 }]} numberOfLines={1}>
            {tile.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 2 },
});
