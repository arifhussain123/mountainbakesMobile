import { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { compactUnits } from '@/features/production/dashboardColumns';
import { useAppTheme } from '@/shared/theme';
import { fmtUnits } from '../../utils/dashboardGaps';

/**
 * The embedded Production Dashboard's time-series charts in react-native-svg
 * (the web draws them with recharts): Demand vs production, Received demand's
 * status columns, Repaired stock's area and Return stock's line. Tap a point
 * or column to read its exact figures above the chart.
 */

const PLOT_H = 150;
const TOP = 12;
const AXIS_W = 34;
const LABEL_H = 16;

function niceCeil(n: number): number {
  if (!(n > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  const m = n / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

/** Every k-th axis label, the last and the tapped one — never a crowded axis. */
const showLabel = (i: number, n: number, sel: number | null) => i === sel || i === n - 1 || i % Math.max(1, Math.ceil(n / 7)) === 0;

function Grid({ max, width, y }: { max: number; width: number; y: (v: number) => number }) {
  const theme = useAppTheme();
  return (
    <>
      {[max, max / 2, 0].map((t) => (
        <G key={t}>
          <Line x1={AXIS_W} x2={width} y1={y(t)} y2={y(t)} stroke={theme.colors.border} strokeDasharray={t ? '3 4' : undefined} />
          <SvgText x={AXIS_W - 4} y={y(t) + 3} fontSize={9} fill={theme.colors.textFaint} textAnchor="end">
            {compactUnits(t)}
          </SvgText>
        </G>
      ))}
    </>
  );
}

function Readout({ title, items }: { title: string; items: { label: string; value: number; color: string }[] }) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.readout, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
      <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{title}</Text>
      {items.map((it) => (
        <Text key={it.label} style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          <Text style={{ color: it.color }}>■ </Text>
          {it.label} <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{fmtUnits(it.value)}</Text>
        </Text>
      ))}
    </View>
  );
}

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  /** Filled beneath the line. */
  area?: boolean;
  dashed?: boolean;
}

/** One or more series over the same buckets, as lines (optionally filled or dashed). */
export const LineAreaChart = memo(function LineAreaChart({ labels, series, dots }: { labels: string[]; series: LineSeries[]; dots?: boolean }) {
  const theme = useAppTheme();
  const [width, onLayout] = useWidth();
  const n = labels.length;
  const [sel, setSel] = useState<number | null>(n ? n - 1 : null);
  const max = useMemo(() => niceCeil(Math.max(0, ...series.flatMap((s) => s.values))), [series]);
  const picked = sel !== null && sel < n ? sel : null;

  const plotW = Math.max(0, width - AXIS_W);
  const slot = n ? plotW / n : 0;
  const y = (v: number) => TOP + (1 - v / max) * (PLOT_H - TOP);
  const x = (i: number) => AXIS_W + i * slot + slot / 2;

  return (
    <View>
      {picked !== null ? (
        <Readout title={labels[picked]!} items={series.map((s) => ({ label: s.label, value: s.values[picked] ?? 0, color: s.color }))} />
      ) : null}
      <View onLayout={onLayout} style={{ marginTop: 8 }}>
        {width > 0 && n > 0 ? (
          <Svg width={width} height={PLOT_H + LABEL_H}>
            <Grid max={max} width={width} y={y} />
            {series.map((s) => {
              const line = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
              const area = s.area && n > 0 ? `${line} L${x(n - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z` : null;
              return (
                <G key={s.key}>
                  {area ? <Path d={area} fill={s.color} fillOpacity={0.14} /> : null}
                  <Path d={line} stroke={s.color} strokeWidth={2} fill="none" strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />
                  {dots && n <= 14
                    ? s.values.map((v, i) => <Rect key={i} x={x(i) - 2.5} y={y(v) - 2.5} width={5} height={5} rx={2.5} fill={s.color} />)
                    : null}
                </G>
              );
            })}
            {labels.map((label, i) => {
              const active = i === picked;
              return (
                <G key={`${label}-${i}`} onPress={() => setSel(i)}>
                  <Rect x={AXIS_W + i * slot} y={0} width={slot} height={PLOT_H + LABEL_H} fill={active ? theme.colors.border : 'transparent'} fillOpacity={0.5} />
                  {active ? series.map((s) => <Rect key={s.key} x={x(i) - 3} y={y(s.values[i] ?? 0) - 3} width={6} height={6} rx={3} fill={s.color} />) : null}
                  {showLabel(i, n, picked) ? (
                    <SvgText
                      x={x(i)}
                      y={PLOT_H + 12}
                      fontSize={9}
                      fontWeight={active ? '700' : '400'}
                      fill={active ? theme.colors.text : theme.colors.textFaint}
                      textAnchor="middle">
                      {label}
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

export interface ColumnStack {
  key: string;
  label: string;
  color: string;
  values: number[];
}

/** Stacked columns per bucket, the first stack at the bottom. */
export const StackedColumnChart = memo(function StackedColumnChart({ labels, stacks }: { labels: string[]; stacks: ColumnStack[] }) {
  const theme = useAppTheme();
  const [width, onLayout] = useWidth();
  const n = labels.length;
  const totals = useMemo(() => labels.map((_, i) => stacks.reduce((sum, s) => sum + (s.values[i] ?? 0), 0)), [labels, stacks]);
  const [sel, setSel] = useState<number | null>(null);
  const max = niceCeil(Math.max(0, ...totals));

  const plotW = Math.max(0, width - AXIS_W);
  const slot = n ? plotW / n : 0;
  const bw = Math.min(28, Math.max(4, slot * 0.62));
  const y = (v: number) => TOP + (1 - v / max) * (PLOT_H - TOP);
  const picked = sel !== null && sel < n ? sel : null;

  return (
    <View>
      {picked !== null ? (
        <Readout
          title={`${labels[picked]} · ${fmtUnits(totals[picked] ?? 0)} units`}
          items={[...stacks].reverse().map((s) => ({ label: s.label, value: s.values[picked] ?? 0, color: s.color }))}
        />
      ) : null}
      <View onLayout={onLayout} style={{ marginTop: 8 }}>
        {width > 0 && n > 0 ? (
          <Svg width={width} height={PLOT_H + LABEL_H}>
            <Grid max={max} width={width} y={y} />
            {labels.map((label, i) => {
              const cx = AXIS_W + i * slot + slot / 2;
              let base = 0;
              const active = i === picked;
              return (
                <G key={`${label}-${i}`} onPress={() => setSel(i)}>
                  <Rect x={AXIS_W + i * slot} y={0} width={slot} height={PLOT_H + LABEL_H} fill={active ? theme.colors.border : 'transparent'} fillOpacity={0.5} />
                  {stacks.map((s) => {
                    const v = s.values[i] ?? 0;
                    if (v <= 0) return null;
                    const top = y(base + v);
                    const h = y(base) - top;
                    base += v;
                    return <Rect key={s.key} x={cx - bw / 2} y={top} width={bw} height={Math.max(1, h)} fill={s.color} />;
                  })}
                  {showLabel(i, n, picked) ? (
                    <SvgText x={cx} y={PLOT_H + 12} fontSize={9} fontWeight={active ? '700' : '400'} fill={active ? theme.colors.text : theme.colors.textFaint} textAnchor="middle">
                      {label}
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

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
});
