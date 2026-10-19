import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { FINANCE_SERIES, dayLabel, formatMoney2 } from '@/features/finance';
import { useAppTheme } from '@/shared/theme';
import type { DailyDemandPoint, WeekReturnsDiscount } from '../../utils/dashboardModel';

/**
 * The web Admin Dashboard's two production charts (`AdminCharts.tsx`) in
 * react-native-svg. Tap a column to read its exact figures; the daily chart's
 * readout carries the "View demands" link the web's chart click opens.
 */

const PLOT_H = 150;
const TOP = 10;
const AXIS_W = 36;

function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${Math.round(a / 1_000)}k`;
  return `${Math.round(a)}`;
}

function niceCeil(n: number): number {
  if (!(n > 0)) return 0;
  const p = 10 ** Math.floor(Math.log10(n));
  const m = n / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

function YTicks({ max, x, x2, y }: { max: number; x: number; x2: number; y: (v: number) => number }) {
  const theme = useAppTheme();
  return (
    <>
      {[max, max / 2, 0].map((t) => (
        <G key={t}>
          <Line x1={x} x2={x2} y1={y(t)} y2={y(t)} stroke={theme.colors.border} strokeDasharray={t ? '3 4' : undefined} />
          <SvgText x={x - 4} y={y(t) + 3} fontSize={9} fill={theme.colors.textFaint} textAnchor="end">
            {compact(t)}
          </SvgText>
        </G>
      ))}
    </>
  );
}

/** Approved demand per business date. A future day has no point. */
export const DailyDemandChart = memo(function DailyDemandChart({ data, onDay }: { data: DailyDemandPoint[]; onDay: (date: string) => void }) {
  const theme = useAppTheme();
  const [width, onLayout] = useWidth();
  const lastPast = useMemo(() => {
    for (let i = data.length - 1; i >= 0; i--) if (data[i]!.demand) return i;
    return Math.max(0, data.length - 1);
  }, [data]);
  const [sel, setSel] = useState(lastPast);
  const max = useMemo(() => niceCeil(Math.max(0, ...data.map((d) => d.demand ?? 0))), [data]);

  if (!data.some((d) => d.demand)) {
    return <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No approved demand in this date range.</Text>;
  }

  const plotW = Math.max(0, width - AXIS_W);
  const slot = data.length ? plotW / data.length : 0;
  const y = (v: number) => TOP + (1 - v / (max || 1)) * (PLOT_H - TOP);
  const pts = data.map((d, i) => ({ x: AXIS_W + i * slot + slot / 2, y: d.demand === null ? null : y(d.demand) }));
  const drawn = pts.filter((p): p is { x: number; y: number } => p.y !== null);
  const line = drawn.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = drawn.length ? `${line} L${drawn[drawn.length - 1]!.x.toFixed(1)} ${y(0)} L${drawn[0]!.x.toFixed(1)} ${y(0)} Z` : '';
  const d = data[Math.min(sel, data.length - 1)];
  const color = theme.colors.primary;

  return (
    <View>
      {d ? (
        <View style={[styles.readout, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]} accessibilityLiveRegion="polite">
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>
              {`${dayLabel(d.date)} ${d.date.slice(0, 4)} · ${d.orders} demand${d.orders === 1 ? '' : 's'}`}
            </Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{d.demand === null ? 'Not yet' : formatMoney2(d.demand)}</Text>
          </View>
          {d.orders > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => onDay(d.date)} hitSlop={8}>
              <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>View demands ›</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View onLayout={onLayout} style={{ marginTop: 8 }}>
        {width > 0 ? (
          <Svg width={width} height={PLOT_H + 16}>
            <YTicks max={max} x={AXIS_W} x2={width} y={y} />
            {area ? <Path d={area} fill={color} fillOpacity={0.12} /> : null}
            {line ? <Path d={line} stroke={color} strokeWidth={2} fill="none" /> : null}
            {data.map((p, i) => {
              const x = AXIS_W + i * slot;
              const active = i === sel;
              const pt = pts[i]!;
              return (
                <G key={p.date} onPress={() => setSel(i)}>
                  <Rect x={x} y={0} width={slot} height={PLOT_H + 16} fill={active ? theme.colors.border : 'transparent'} />
                  {active && pt.y !== null ? <Rect x={pt.x - 3} y={pt.y - 3} width={6} height={6} rx={3} fill={color} /> : null}
                  {i % 5 === 0 || i === data.length - 1 || active ? (
                    <SvgText x={x + slot / 2} y={PLOT_H + 12} fontSize={9} fontWeight={active ? '700' : '400'} fill={active ? theme.colors.text : theme.colors.textFaint} textAnchor="middle">
                      {p.label}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
    </View>
  );
});

/** Return and Discount per week of the month, labelled directly above each bar. */
export const WeeklyReturnDiscountChart = memo(function WeeklyReturnDiscountChart({ data }: { data: WeekReturnsDiscount[] }) {
  const theme = useAppTheme();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const max = useMemo(() => niceCeil(Math.max(0, ...data.map((d) => Math.max(d.returns, d.discount)))), [data]);

  if (!data.some((d) => d.returns || d.discount)) {
    return <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No returns or discounts in this date range.</Text>;
  }

  const plotW = Math.max(0, width - AXIS_W);
  const slot = data.length ? plotW / data.length : 0;
  const bw = Math.min(30, Math.max(6, (slot - 14) / 2));
  const y = (v: number) => TOP + 8 + (1 - v / (max || 1)) * (PLOT_H - TOP - 8);
  const picked = sel === null ? null : data[sel];

  return (
    <View>
      {picked ? (
        <View style={[styles.readout, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
          <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700', flex: 1 }]}>{picked.label}</Text>
          <Text style={[theme.typography.label, { color: FINANCE_SERIES.returns, fontWeight: '700' }]}>Return {formatMoney2(picked.returns)}</Text>
          <Text style={[theme.typography.label, { color: FINANCE_SERIES.discount, fontWeight: '700' }]}>Discount {formatMoney2(picked.discount)}</Text>
        </View>
      ) : null}
      <View onLayout={onLayout} style={{ marginTop: 8 }}>
        {width > 0 ? (
          <Svg width={width} height={PLOT_H + 16}>
            <YTicks max={max} x={AXIS_W} x2={width} y={y} />
            {data.map((w, i) => {
              const cx = AXIS_W + i * slot + slot / 2;
              const bars = [
                { key: 'r', v: w.returns, x: cx - bw - 1, color: FINANCE_SERIES.returns },
                { key: 'd', v: w.discount, x: cx + 1, color: FINANCE_SERIES.discount },
              ];
              return (
                <G key={w.key} onPress={() => setSel(i)}>
                  <Rect x={AXIS_W + i * slot} y={0} width={slot} height={PLOT_H + 16} fill={sel === i ? theme.colors.border : 'transparent'} />
                  {bars.map((b) =>
                    b.v > 0 ? (
                      <G key={b.key}>
                        <Rect x={b.x} y={y(b.v)} width={bw} height={y(0) - y(b.v)} rx={3} fill={b.color} />
                        <SvgText x={b.x + bw / 2} y={y(b.v) - 3} fontSize={9} fill={theme.colors.textSecondary} textAnchor="middle">
                          {compact(b.v)}
                        </SvgText>
                      </G>
                    ) : null,
                  )}
                  <SvgText x={cx} y={PLOT_H + 12} fontSize={9} fill={theme.colors.textFaint} textAnchor="middle">
                    {w.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View style={styles.legend}>
        <Text style={[theme.typography.label, { color: FINANCE_SERIES.returns, fontWeight: '600' }]}>■ Return</Text>
        <Text style={[theme.typography.label, { color: FINANCE_SERIES.discount, fontWeight: '600' }]}>■ Discount</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 8 },
});
