import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface PaymentMethodTile {
  key: string;
  label: string;
  value: string;
  dotColor: string;
  /** The tile's method is the list's active payment filter. */
  selected?: boolean;
}

export interface PaymentMethodTileGridProps {
  tiles: PaymentMethodTile[];
  /** Makes each tile a button — the screen uses it to filter by that method. */
  onPressTile?: (key: string) => void;
}

/**
 * Design `09 Sales` lines 448-449 — the `{{ slPay }}` 2x2 tile grid: a
 * color-coded dot + label, then the big value, one tile per payment method.
 */
export function PaymentMethodTileGrid({ tiles, onPressTile }: PaymentMethodTileGridProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          disabled={!onPressTile}
          accessibilityRole={onPressTile ? 'button' : undefined}
          accessibilityState={onPressTile ? { selected: !!tile.selected } : undefined}
          accessibilityLabel={onPressTile ? `${tile.label} ${tile.value}` : undefined}
          onPress={() => onPressTile?.(tile.key)}
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.cardFill,
              borderColor: tile.selected ? theme.colors.primary : theme.colors.cardBorder,
              borderRadius: theme.radii.md,
            },
          ]}>
          <View style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: tile.dotColor }]} />
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {tile.label}
            </Text>
          </View>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 4 }]} numberOfLines={1}>
            {tile.value}
          </Text>
        </Pressable>
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
