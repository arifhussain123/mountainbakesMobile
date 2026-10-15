import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { SalesAnalyticsDailyPoint } from '@/api';

export interface DailySalesLineChartProps {
  data: SalesAnalyticsDailyPoint[];
}

const WIDTH = 312;
const HEIGHT = 170;
const CHART_TOP = 10;
const CHART_BOTTOM = 130;
const GRID_LINES = [10, 50, 90, 130];
const GRID_LABELS = ['60k', '40k', '20k'];

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

/**
 * design UIandUX/mountainbakesBranch.html screen 23, lines 1120-1132 — the
 * "Daily Sales" tab: a dashed grey Orders line + a solid orange Revenue line
 * over 60k/40k/20k gridlines, tappable points with date labels, and a legend.
 * This is a different shape from the Home dashboard's `SalesChart` (plain
 * orange revenue bars with no Orders series), so it's a new reports-local
 * component rather than a reuse of that one.
 */
export function DailySalesLineChart({ data }: DailySalesLineChartProps) {
  const theme = useAppTheme();
  const [selectedIndex, setSelectedIndex] = useState(data.length - 1);
  const selected = data[selectedIndex];

  const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
  const maxOrders = Math.max(1, ...data.map((d) => d.orders));

  const step = data.length > 1 ? WIDTH / (data.length - 1) : 0;
  const revenuePoints = data.map((d, i) => ({
    x: data.length > 1 ? i * step : WIDTH / 2,
    y: CHART_BOTTOM - (d.revenue / maxRevenue) * (CHART_BOTTOM - CHART_TOP),
  }));
  const orderPoints = data.map((d, i) => ({
    x: data.length > 1 ? i * step : WIDTH / 2,
    y: CHART_BOTTOM - (d.orders / maxOrders) * (CHART_BOTTOM - CHART_TOP),
  }));

  const selX = revenuePoints[selectedIndex]?.x ?? 0;

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Daily Sales</Text>
        {selected ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700' }]}>{formatCurrency(selected.revenue)}</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              {formatDisplayDate(selected.date)} · {selected.orders} orders
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: theme.spacing.sm }}>
        <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          {GRID_LINES.map((y, i) => (
            <Line
              key={y}
              x1={0}
              y1={y}
              x2={WIDTH}
              y2={y}
              stroke={i === GRID_LINES.length - 1 ? theme.colors.border : theme.colors.cardBorder}
              strokeDasharray={i === GRID_LINES.length - 1 ? undefined : '3 4'}
            />
          ))}
          {GRID_LABELS.map((label, i) => (
            <SvgText key={label} x={2} y={GRID_LINES[i] - 3} fill={theme.colors.textFaint} fontSize={8} fontWeight="600">
              {label}
            </SvgText>
          ))}
          <Line x1={selX} y1={CHART_TOP} x2={selX} y2={CHART_BOTTOM} stroke={theme.colors.border} />
          <Path d={buildPath(orderPoints)} fill="none" stroke={theme.colors.textSecondary} strokeWidth={1.6} strokeDasharray="4 3" />
          <Path d={buildPath(revenuePoints)} fill="none" stroke={theme.colors.primary} strokeWidth={2.2} />
          {revenuePoints.map((p, i) => (
            <Circle
              key={data[i].date}
              cx={p.x}
              cy={p.y}
              r={i === selectedIndex ? 4 : 3}
              fill={theme.colors.background}
              stroke={theme.colors.primary}
              strokeWidth={2}
            />
          ))}
        </Svg>
        {/* Transparent tap targets + date labels overlaid on the SVG, one per point. */}
        <View style={styles.tapRow} pointerEvents="box-none">
          {data.map((point, i) => (
            <Pressable key={point.date} onPress={() => setSelectedIndex(i)} style={styles.tapTarget}>
              <Text
                style={[theme.typography.label, { color: i === selectedIndex ? theme.colors.text : theme.colors.textFaint, fontSize: 8 }]}
                numberOfLines={1}>
                {formatDisplayDate(point.date).slice(0, 2)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.legend, { marginTop: theme.spacing.xs }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: theme.colors.primary }]} />
          <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '600' }]}>Revenue</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLineDashed, { borderColor: theme.colors.textSecondary }]} />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '600' }]}>Orders</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tapRow: { flexDirection: 'row', marginTop: -16 },
  tapTarget: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 14, height: 2 },
  legendLineDashed: { width: 14, borderTopWidth: 2, borderStyle: 'dashed' },
});
