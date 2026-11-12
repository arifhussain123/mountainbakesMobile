import { StyleSheet, View } from 'react-native';
import { tintFill, useAppTheme } from '@/shared/theme';
import { MiniStat, type IconName } from '@/shared/ui';

export interface OrderMetaItem {
  key: string;
  /** Kept for callers; the redesign's mini stats carry no icon. */
  icon: IconName;
  label: string;
  value: string;
}

export interface OrderMetaGridProps {
  items: OrderMetaItem[];
}

/** Create Order's order details (Branch / Branch Code / Date / Time / Order No. / Ordered By) as a lavender strip of mini stats, three a row. */
export function OrderMetaGrid({ items }: OrderMetaGridProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.grid, { backgroundColor: tintFill(theme) }]}>
      {items.map((item) => (
        <MiniStat key={item.key} label={item.label} value={item.value} style={styles.cell} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  cell: { flexBasis: '33.33%', flexGrow: 0, paddingRight: 8 },
});
