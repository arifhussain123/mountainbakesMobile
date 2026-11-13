import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { tintFill, useAppTheme } from '@/shared/theme';
import { Card, MiniStat } from '@/shared/ui';
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
/** The redesign's second line colour ("honey") for the Orders series. */
const HONEY = '#FFD36E';
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
 * 2026 redesign B23 "Daily sales" card — dual line chart (solid saffron
 * Revenue, dashed honey Orders; each line scaled to its own max, so there is
 * no shared y-axis to label). Default-selects the
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
  const ordersColor = theme.isDark ? theme.colors.textSecondary : HONEY;

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
            stroke={theme.colors.border}
            strokeDasharray={i === GRID_LINES.length - 1 ? undefined : '3 4'}
          />
        ))}
        {data.length > 0 ? <Line x1={selX} y1={CHART_TOP} x2={selX} y2={CHART_BOTTOM} stroke={theme.colors.border} /> : null}
        <Path d={buildPath(orderPoints)} fill="none" stroke={ordersColor} strokeWidth={2.5} strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={buildPath(revenuePoints)} fill="none" stroke={theme.colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {revenuePoints.map((p, i) => (
          <Circle
            key={data[i].date}
            cx={p.x}
            cy={p.y}
            r={i === selectedIndex ? 5 : 3}
            fill={i === selectedIndex ? theme.colors.primary : theme.isDark ? theme.colors.background : '#FFFFFF'}
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
    <Card accessibilityLabel={trendAccessibilitySummary(data, trend.bestDay, trend.slowestDay)} style={styles.card}>
      <Text style={[styles.h3, { color: theme.colors.text }]}>Daily sales</Text>
      <TrendTooltip
        point={selected}
        canStepPrev={selectedIndex > 0}
        canStepNext={selectedIndex < data.length - 1}
        onStep={(dir) => setSelectedIndex((i) => (dir === 'prev' ? Math.max(0, i - 1) : Math.min(data.length - 1, i + 1)))}
      />

      <View>
        {data.length > SCROLL_THRESHOLD ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {chart}
          </ScrollView>
        ) : (
          chart
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Revenue</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: ordersColor }]} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Orders</Text>
        </View>
      </View>

      <View style={[styles.summaryRow, { backgroundColor: tintFill(theme) }]}>
        <View style={styles.summaryCell}>
          <MiniStat label="Best day" value={trend.bestDay ? formatCurrency(trend.bestDay.sales) : '—'} valueColor={theme.colors.success} />
          <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{trend.bestDay ? formatDisplayDate(trend.bestDay.date) : ' '}</Text>
        </View>
        <View style={styles.summaryCell}>
          <MiniStat label="Slowest day" value={trend.slowestDay ? formatCurrency(trend.slowestDay.sales) : '—'} valueColor={theme.colors.danger} />
          <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{trend.slowestDay ? formatDisplayDate(trend.slowestDay.date) : ' '}</Text>
        </View>
        <View style={styles.summaryCell}>
          <MiniStat label="Daily avg" value={formatCurrency(trend.averageDailyRevenue)} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  labelsRow: { flexDirection: 'row', marginTop: 6 },
  label: { textAlign: 'center', fontSize: 11, fontWeight: '500' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 8, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12 },
  summaryCell: { flex: 1, minWidth: 0, gap: 2 },
  xs: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
});
