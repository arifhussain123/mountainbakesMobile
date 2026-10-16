import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface MovementRowProps {
  opening: number;
  newQty: number;
  sold: number;
  returned: number;
  adjustment: number;
}

/**
 * Compact movement columns on a stock card. Zeros render muted so nonzero
 * movement stands out, and every figure always shows its +/- sign — color is
 * never the only signal (brief's own accessibility rule).
 */
export function MovementRow({ opening, newQty, sold, returned, adjustment }: MovementRowProps) {
  const theme = useAppTheme();
  const muted = theme.colors.textFaint;

  return (
    <View style={styles.row}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        Open <Text style={{ color: opening === 0 ? muted : theme.colors.text, fontWeight: '700' }}>{opening}</Text>
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        New <Text style={{ color: newQty === 0 ? muted : theme.colors.success, fontWeight: '700' }}>+{newQty}</Text>
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        Sold <Text style={{ color: sold === 0 ? muted : theme.colors.danger, fontWeight: '700' }}>-{sold}</Text>
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        Ret <Text style={{ color: returned === 0 ? muted : theme.colors.warning, fontWeight: '700' }}>{returned === 0 ? 0 : `-${returned}`}</Text>
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        Adj <Text style={{ color: adjustment === 0 ? muted : theme.colors.text, fontWeight: '700' }}>{adjustment >= 0 ? `+${adjustment}` : adjustment}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
