import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { completedOrders, orderCompletionPct } from '../calculations';

export interface OrdersCardProps {
  total: number;
  pending: number;
  cancelled: number;
}

const SIZE = 150;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Design lines 156-160 — the "Orders Today" donut (stroke-dasharray driven by
 * the completed %, "N% COMPLETED" centered) + a label/value row list below it.
 */
export function OrdersCard({ total, pending, cancelled }: OrdersCardProps) {
  const theme = useAppTheme();
  const completed = completedOrders(total, pending, cancelled);
  const pct = Math.round(orderCompletionPct(total, pending, cancelled) ?? 0);
  const dash = (pct / 100) * CIRCUMFERENCE;

  const rows = [
    { label: 'Total', value: total },
    { label: 'Pending', value: pending },
    { label: 'Completed', value: completed },
    { label: 'Cancelled', value: cancelled },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.donutWrap}>
        <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={theme.colors.border} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={theme.colors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
            fill="none"
          />
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={[theme.typography.screenTitle, { color: theme.colors.text, fontSize: 28 }]}>{pct}%</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, letterSpacing: 1.2, marginTop: 4 }]}>COMPLETED</Text>
        </View>
      </View>
      <View style={[styles.list, { marginTop: theme.spacing.md }]}>
        {rows.map((row, index) => (
          <View key={row.label} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary, fontWeight: '600' }]}>{row.label}</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '800' }]}>{row.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  donutWrap: { width: SIZE, height: SIZE },
  donutCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  list: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
});
