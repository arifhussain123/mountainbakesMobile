import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface DailySaleDifferenceCardProps {
  /** The window's total difference — positive is over, negative is short, 0 is matched. */
  difference: number;
}

/** `Rs. 20 over` / `Rs. 20 short` / `Matched` — the row-card wording, applied to the window total. */
export function formatDifferenceAmount(difference: number): string {
  if (difference === 0) return 'Matched';
  return `${formatCurrency(Math.abs(difference))} ${difference > 0 ? 'over' : 'short'}`;
}

/**
 * The window's Difference as a soft tinted strip (red when out, green when
 * matched) with the icon in a round bubble — counted days only.
 */
export function DailySaleDifferenceCard({ difference }: DailySaleDifferenceCardProps) {
  const theme = useAppTheme();
  const isMatched = difference === 0;
  const color = isMatched ? theme.colors.success : theme.colors.danger;
  const fill = theme.isDark ? `${color}1F` : isMatched ? '#E1F7EE' : '#FDE8E8';

  return (
    <View style={[styles.card, { backgroundColor: fill }]}>
      <View style={styles.grow}>
        <Text style={[styles.label, { color }]}>Difference · counted days only</Text>
        <Text style={[styles.value, { color }]}>{formatDifferenceAmount(difference)}</Text>
      </View>
      <View style={[styles.bubble, { backgroundColor: theme.isDark ? `${color}2E` : 'rgba(255,255,255,0.7)' }]}>
        <Icon name={isMatched ? 'check' : 'warning'} size={20} color={color} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  value: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  bubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
