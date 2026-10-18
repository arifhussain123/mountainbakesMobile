import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { SalesAnalyticsDailyPoint } from '@/api';
import { summarizeTrend } from '../calculations';
import { TrendTooltip } from './TrendTooltip';

export interface SalesTrendChartProps {
  data: SalesAnalyticsDailyPoint[];
}

const HEIGHT = 170;
const CHART_TOP = 10;
const CHART_BOTTOM = 130;
const GRID_LINES = [10, 50, 90, 130];
const GRID_LABELS = ['60k', '40k', '20k'];
const POINT_WIDTH = 40;
const MIN_WIDTH = 312;
/** Horizontal scroll kicks in past this many points — a fixed-width chart gets unreadable beyond here. */
const SCROLL_THRESHOLD = 16;

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

function trendAccessibilitySummary(
  data: SalesAnalyticsDailyPoint[],
  best: { date: string; sales: number } | null,
  slowest: { date: string; sales: number } | null,
): string {
  if (data.length === 0) return 'No sales data for this range.';
  const parts = [`Daily sales trend, ${data.length} days.`];
  if (best) parts.push(`Highest: ${formatDisplayDate(best.date)}, ${formatCurrency(best.sales)}.`);
  if (slowest) parts.push(`Lowest: ${formatDisplayDate(slowest.date)}, ${formatCurrency(slowest.sales)}.`);
  return parts.join(' ');
}

/**
 * design UIandUX/mountainbakesBranch.html screen 23, lines 1120-1132 — dual
 * line chart (solid orange Revenue, dashed grey Orders). Default-selects the
 * latest day, like the web. Scrolls horizontally past ~16 points (a weekly
 * range over a long custom window, or a monthly/yearly report) rather than
 * squeezing every point unreadably into a fixed width.
 */
export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const theme = useAppTheme();
  const [selectedIndex, setSelectedIndex] = useState(data.length - 1);
  const selected = data[selectedIndex] ?? null;
  const trend = summarizeTrend(data);

  const width = Math.max(MIN_WIDTH, data.length * POINT_WIDTH);
  const maxRevenue = Math.max(1, ...data.map((d) => d.sales));
  const maxOrders = Math.max(1, ...data.map((d) => d.transactions));
  const step = data.length > 1 ? width / (data.length - 1) : 0;

  const revenuePoints = data.map((d, i) => ({
    x: data.length > 1 ? i * step : width / 2,
    y: CHART_BOTTOM - (d.sales / maxRevenue) * (CHART_BOTTOM - CHART_TOP),
  }));
  const orderPoints = data.map((d, i) => ({
    x: data.length > 1 ? i * step : width / 2,
    y: CHART_BOTTOM - (d.transactions / maxOrders) * (CHART_BOTTOM - CHART_TOP),
  }));
  const selX = revenuePoints[selectedIndex]?.x ?? 0;

  const chart = (
    <View style={{ width }}>
      <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
        {GRID_LINES.map((y, i) => (
          <Line
            key={y}
            x1={0}
            y1={y}
            x2={width}
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
        {data.length > 0 ? <Line x1={selX} y1={CHART_TOP} x2={selX} y2={CHART_BOTTOM} stroke={theme.colors.border} /> : null}
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
            onPress={() => setSelectedIndex(i)}
          />
        ))}
      </Svg>
      <View style={styles.labelsRow}>
        {data.map((point, i) => (
          <Text
            key={point.date}
            onPress={() => setSelectedIndex(i)}
            style={[styles.label, { width: step || width, color: i === selectedIndex ? theme.colors.text : theme.colors.textFaint }]}
            numberOfLines={1}>
            {formatDisplayDate(point.date).slice(0, 2)}
          </Text>
        ))}
      </View>
    </View>
  );

  return (
    <Card accessibilityLabel={trendAccessibilitySummary(data, trend.bestDay, trend.slowestDay)}>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Daily Sales</Text>
      <View style={{ marginTop: theme.spacing.sm }}>
        <TrendTooltip
          point={selected}
          canStepPrev={selectedIndex > 0}
          canStepNext={selectedIndex < data.length - 1}
          onStep={(dir) => setSelectedIndex((i) => (dir === 'prev' ? Math.max(0, i - 1) : Math.min(data.length - 1, i + 1)))}
        />
      </View>

      <View style={{ marginTop: theme.spacing.md }}>
        {data.length > SCROLL_THRESHOLD ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {chart}
          </ScrollView>
        ) : (
          chart
        )}
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

      <View style={[styles.summaryRow, { marginTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm }]}>
        <View style={styles.summaryCell}>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>Best Day</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.success, fontWeight: '700' }]}>
            {trend.bestDay ? formatCurrency(trend.bestDay.sales) : '—'}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{trend.bestDay ? formatDisplayDate(trend.bestDay.date) : ''}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>Slowest Day</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, fontWeight: '700' }]}>
            {trend.slowestDay ? formatCurrency(trend.slowestDay.sales) : '—'}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{trend.slowestDay ? formatDisplayDate(trend.slowestDay.date) : ''}</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>Daily Average</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(trend.averageDailyRevenue)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  labelsRow: { flexDirection: 'row', marginTop: 6 },
  label: { textAlign: 'center', fontSize: 10, fontWeight: '600' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 14, height: 2 },
  legendLineDashed: { width: 14, borderTopWidth: 2, borderStyle: 'dashed' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryCell: { flex: 1, alignItems: 'center' },
});
