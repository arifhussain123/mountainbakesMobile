import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface ClosingStatTilesProps {
  sales: number;
  expenses: number;
  net: number;
  stockOnHand: number;
}

interface Tile {
  key: string;
  label: string;
  value: string;
  icon: IconName;
  tint: string;
}

/** Sales / Expenses / Net / Stock on hand, each with its own tinted icon — the grid beneath the Cash in Hand hero. */
export function ClosingStatTiles({ sales, expenses, net, stockOnHand }: ClosingStatTilesProps) {
  const theme = useAppTheme();

  const tiles: Tile[] = [
    { key: 'sales', label: 'Sales', value: formatCurrency(sales), icon: 'sales', tint: theme.colors.success },
    { key: 'expenses', label: 'Expenses', value: formatCurrency(expenses), icon: 'receipt', tint: theme.colors.danger },
    { key: 'net', label: 'Net', value: formatCurrency(net), icon: 'trending-up', tint: theme.colors.primary },
    { key: 'stock', label: 'Stock on hand', value: `${stockOnHand}`, icon: 'box', tint: theme.colors.info },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.key} style={[styles.tile, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg }]}>
          <View style={[styles.iconBadge, { backgroundColor: `${tile.tint}1F` }]}>
            <Icon name={tile.icon} size={16} color={tile.tint} />
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>{tile.label}</Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit>
            {tile.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, padding: 12 },
  iconBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
