import { StyleSheet, View } from 'react-native';
import type { PastelTone } from '@/shared/theme';
import { KpiTile } from '@/shared/ui';

export interface PaymentMethodTile {
  key: string;
  label: string;
  value: string;
  /** Optional sub-line (e.g. "9 products" on the Items tile). */
  sub?: string;
  /** The tile's method is the list's active payment filter. */
  selected?: boolean;
  /** Not a filter (e.g. the Items tile) — never pressable. */
  static?: boolean;
}

export interface PaymentMethodTileGridProps {
  tiles: PaymentMethodTile[];
  /** Makes each tile a button — the screen uses it to filter by that method. */
  onPressTile?: (key: string) => void;
}

/**
 * Redesign `09 Sales` — the `grid3` of pastel kpi tiles (Cash / Easypaisa /
 * Items…). Three to a row, wrapping; pastel tones cycle in order like the
 * mockup's `.kpi:nth-child(5n+k)`. A selected tile gets an accent ring.
 */
export function PaymentMethodTileGrid({ tiles, onPressTile }: PaymentMethodTileGridProps) {
  return (
    <View style={styles.grid}>
      {tiles.map((tile, index) => {
        const pressable = !!onPressTile && !tile.static;
        return (
          <KpiTile
            key={tile.key}
            tone={(index % 5) as PastelTone}
            label={tile.label}
            value={tile.value}
            sub={tile.sub}
            selected={pressable && !!tile.selected}
            onPress={pressable ? () => onPressTile?.(tile.key) : undefined}
            style={styles.cell}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // Three per row; the ring around each tile eats into the 8pt mockup gap.
  cell: { flexBasis: '31%', flexGrow: 1 },
});
