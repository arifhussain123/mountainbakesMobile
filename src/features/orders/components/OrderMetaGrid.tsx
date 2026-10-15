import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, type IconName } from '@/shared/ui';

export interface OrderMetaItem {
  key: string;
  icon: IconName;
  label: string;
  value: string;
}

export interface OrderMetaGridProps {
  items: OrderMetaItem[];
}

/** branchApp.md screen 05 — the 2-col meta grid: Branch / Branch Code / Date / Time / Order No. / Ordered By. */
export function OrderMetaGrid({ items }: OrderMetaGridProps) {
  const theme = useAppTheme();

  return (
    <Card style={styles.grid}>
      {items.map((item) => (
        <View key={item.key} style={styles.cell}>
          <Icon name={item.icon} size={14} color={theme.colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.label, { color: theme.colors.textFaint, letterSpacing: 1 }]} numberOfLines={1}>
              {item.label.toUpperCase()}
            </Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', marginTop: 3 }]} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 10 },
  cell: { width: '50%', flexDirection: 'row', gap: 8, paddingVertical: 6, paddingRight: 8 },
});
