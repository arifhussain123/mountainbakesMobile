import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import type { ReportBranchData, ReportDailyPoint, ReportPaymentMethodBreakdown, ReportTopProduct } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';

/**
 * The web /reports page's cards, drawn with react-native-svg (no chart
 * library): Daily Sales, Branch Performance, Top Products donut, Top 10
 * Products and Payment Methods. Every figure is `/reports/summary`'s.
 */

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
  staff: 'Staff',
  card: 'Card',
  online: 'Online',
};

/** `Rs.34,050` — the web page's own money style. */
const rs = (n: number) => `Rs.${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
const compact = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v)));
const dayLabel = (iso: string) => {
  try {
    return format(parseISO(iso.slice(0, 10)), 'MMM d');
  } catch {
    return iso;
  }
};

function CardTitle({ children }: { children: string }) {
  const theme = useAppTheme();
  return <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{children}</Text>;
}

function EmptyNote({ children, height = 140 }: { children: string; height?: number }) {
  const theme = useAppTheme();
  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Payment Methods ─────────────────────────────────────────────────────────

/** "{label} ({count})" against each method's total; "No sales in this period" when empty. */
export function PaymentMethodsSummaryCard({ methods }: { methods: ReportPaymentMethodBreakdown[] }) {
  const theme = useAppTheme();
  return (
    <Card>
      <CardTitle>Payment Methods</CardTitle>
      <View style={{ marginTop: theme.spacing.sm, gap: 6 }}>
        {methods.length === 0 ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No sales in this period</Text>
        ) : (
          methods.map((pm) => (
            <View key={pm.method} style={styles.spread}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flex: 1 }]}>
                {PAYMENT_METHOD_LABELS[pm.method] ?? pm.method} ({pm.count})
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{rs(pm.total)}</Text>
            </View>
          ))
        )}
      </View>
    </Card>
  );
}

// ─── Daily Sales ─────────────────────────────────────────────────────────────

const PANEL_H = 96;
const PAD_TOP = 8;
const Y_LABEL_W = 34;

/**
 * Revenue and Orders over the period. The web draws them on one plot with two
 * y-axes; here they are two aligned panels sharing the x-axis and one
 * selection, so each line keeps its own honest scale. Tap or drag across the
 * chart to read a day; it opens on the latest day, as the web's header line does.
 */
export function DailySalesChartCard({ data }: { data: ReportDailyPoint[] }) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const idx = selected !== null && selected < data.length ? selected : data.length - 1;
  const point = data[idx];

  const plotW = Math.max(0, width - Y_LABEL_W);
  const xAt = (i: number) => Y_LABEL_W + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
  const showDots = data.length <= 14;

  const pickAt = (e: GestureResponderEvent) => {
    if (data.length === 0 || plotW <= 0) return;
    const x = e.nativeEvent.locationX - Y_LABEL_W;
    const i = data.length > 1 ? Math.round((x / plotW) * (data.length - 1)) : 0;
    setSelected(Math.min(data.length - 1, Math.max(0, i)));
  };

  const xTicks = useMemo(() => {
    if (data.length === 0) return [];
    const count = Math.min(5, data.length);
    const set = new Set<number>();
    for (let k = 0; k < count; k++) set.add(count === 1 ? 0 : Math.round((k / (count - 1)) * (data.length - 1)));
    return [...set];
  }, [data.length]);

  const panel = (values: number[], color: string, formatTick: (v: number) => string, label: string) => {
    const max = Math.max(1, ...values);
    const yAt = (v: number) => PAD_TOP + (1 - v / max) * (PANEL_H - PAD_TOP);
    const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');
    return (
      <View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 2 }]}>{label}</Text>
        <Svg width={width} height={PANEL_H + 2}>
          {[0, 0.5, 1].map((f) => (
            <Line
              key={f}
              x1={Y_LABEL_W}
              x2={width}
              y1={yAt(max * f)}
              y2={yAt(max * f)}
              stroke={theme.colors.border}
              strokeDasharray={f === 0 ? undefined : '3 4'}
            />
          ))}
          <Line x1={xAt(idx)} x2={xAt(idx)} y1={PAD_TOP} y2={PANEL_H} stroke={theme.colors.textFaint} strokeWidth={1} />
          {values.length > 1 ? <Path d={path} fill="none" stroke={color} strokeWidth={2} /> : null}
          {values.map((v, i) =>
            showDots || i === idx ? (
              <Circle key={i} cx={xAt(i)} cy={yAt(v)} r={i === idx ? 4.5 : 3} fill={color} stroke={theme.colors.surface} strokeWidth={i === idx ? 2 : 1} />
            ) : null,
          )}
        </Svg>
        {/* Y ticks as text — max and half, the baseline is 0. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: 16 }]}>
          {[1, 0.5].map((f) => (
            <Text key={f} style={[styles.yTick, { top: yAt(max * f) - 7, color: theme.colors.textFaint }]}>
              {formatTick(max * f)}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Card>
      <CardTitle>Daily Sales</CardTitle>
      {data.length === 0 ? (
        <EmptyNote height={180}>No sales in this period</EmptyNote>
      ) : (
        <>
          {point ? (
            <View style={[styles.readout, { marginTop: theme.spacing.sm }]}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{dayLabel(point.date)}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{rs(point.totalRevenue)}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{point.totalOrders.toLocaleString('en-US')} orders</Text>
            </View>
          ) : null}
          <View
            onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={pickAt}
            onResponderMove={pickAt}
            accessibilityLabel={`Daily sales chart, ${data.length} days. Selected ${point ? dayLabel(point.date) : ''}: ${point ? rs(point.totalRevenue) : ''}, ${point?.totalOrders ?? 0} orders.`}
            style={{ marginTop: theme.spacing.sm, gap: 8 }}>
            {width > 0 ? (
              <>
                {panel(
                  data.map((d) => d.totalRevenue),
                  theme.colors.primary,
                  compact,
                  'Revenue',
                )}
                {panel(
                  data.map((d) => d.totalOrders),
                  theme.colors.infoAlt,
                  (v) => compact(v),
                  'Orders',
                )}
              </>
            ) : null}
          </View>
          {width > 0 ? (
            <View style={{ height: 16, marginTop: 4 }}>
              {xTicks.map((i) => (
                <Text
                  key={i}
                  numberOfLines={1}
                  style={[
                    styles.xTick,
                    { left: Math.min(Math.max(0, xAt(i) - 24), width - 48), color: i === idx ? theme.colors.text : theme.colors.textFaint },
                  ]}>
                  {dayLabel(data[i].date)}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

// ─── Branch Performance ──────────────────────────────────────────────────────

/** Revenue and Orders per branch; "Mountain Bakes " is dropped from the names, as on the web. */
export function BranchPerformanceCard({ data }: { data: ReportBranchData[] }) {
  const theme = useAppTheme();
  const maxRevenue = Math.max(1, ...data.map((b) => b.totalRevenue));
  const maxOrders = Math.max(1, ...data.map((b) => b.totalOrders));
  const bar = (fraction: number, color: string, text: string) => (
    <View style={styles.barRow}>
      <View style={[styles.barTrack, { backgroundColor: theme.colors.border }]}>
        <View style={{ width: `${Math.max(fraction > 0 ? 2 : 0, fraction * 100)}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.text, width: 92, textAlign: 'right' }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
  return (
    <Card>
      <CardTitle>Branch Performance</CardTitle>
      {data.length === 0 ? (
        <EmptyNote>No sales in this period</EmptyNote>
      ) : (
        <>
          <View style={[styles.legend, { marginTop: theme.spacing.sm }]}>
            <LegendSwatch color={theme.colors.primary} label="Revenue" />
            <LegendSwatch color={theme.colors.infoAlt} label="Orders" />
          </View>
          {data.map((b, i) => (
            <View key={b.branchId} style={[{ paddingVertical: 10 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', marginBottom: 6 }]} numberOfLines={1}>
                {b.branchName.replace('Mountain Bakes ', '')}
              </Text>
              {bar(b.totalRevenue / maxRevenue, theme.colors.primary, rs(b.totalRevenue))}
              {bar(b.totalOrders / maxOrders, theme.colors.infoAlt, `${b.totalOrders.toLocaleString('en-US')} orders`)}
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

// ─── Top Products ────────────────────────────────────────────────────────────

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number): string {
  const pt = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = pt(rOuter, start);
  const [x2, y2] = pt(rOuter, end);
  const [x3, y3] = pt(rInner, end);
  const [x4, y4] = pt(rInner, start);
  return `M${x1} ${y1} A${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}

/**
 * Donut of the top six products by revenue (web `TopProductsChart`). Names cut
 * at 20 characters like the web legend; tap a slice or a legend row to read
 * its revenue in the centre.
 */
export function TopProductsDonutCard({ data }: { data: ReportTopProduct[] }) {
  const theme = useAppTheme();
  // Fixed categorical order (validated: light passes; contrast relief = labelled legend + the Top 10 list).
  const palette = [theme.colors.primary, theme.colors.infoAlt, theme.colors.warning, theme.colors.secondary, theme.colors.success, theme.colors.orange];
  const slices = data.slice(0, 6).map((p, i) => ({
    key: p.productId || p.productName,
    name: p.productName.length > 20 ? `${p.productName.slice(0, 20)}…` : p.productName,
    value: p.totalRevenue,
    color: palette[i % palette.length],
  }));
  const total = slices.reduce((s, x) => s + x.value, 0);
  const [active, setActive] = useState<number | null>(null);

  const size = 190;
  const c = size / 2;
  const gap = slices.length > 1 ? 0.03 : 0;
  let angle = -Math.PI / 2;
  const arcs = slices.map((s, i) => {
    const sweep = total > 0 ? (s.value / total) * Math.PI * 2 : 0;
    const start = angle + gap / 2;
    const end = angle + sweep - gap / 2;
    angle += sweep;
    if (sweep <= 0) return null;
    // A single full slice cannot be drawn as one arc; split it in two halves.
    const d =
      sweep >= Math.PI * 2 - 0.001
        ? `${arcPath(c, c, 88, 56, -Math.PI / 2, Math.PI / 2)} ${arcPath(c, c, 88, 56, Math.PI / 2, (Math.PI * 3) / 2)}`
        : arcPath(c, c, i === active ? 92 : 88, 56, start, end);
    return <Path key={s.key} d={d} fill={s.color} opacity={active === null || active === i ? 1 : 0.45} onPress={() => setActive(active === i ? null : i)} />;
  });

  const focus = active !== null ? slices[active] : null;

  return (
    <Card>
      <CardTitle>Top Products</CardTitle>
      {slices.length === 0 ? (
        <EmptyNote height={200}>No data yet</EmptyNote>
      ) : (
        <>
          <View style={{ alignItems: 'center', marginTop: theme.spacing.sm }}>
            <View style={{ width: size, height: size }}>
              <Svg width={size} height={size}>{arcs}</Svg>
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }]}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textAlign: 'center' }]} numberOfLines={2}>
                  {focus ? focus.name : 'Revenue'}
                </Text>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{rs(focus ? focus.value : total)}</Text>
              </View>
            </View>
          </View>
          <View style={{ marginTop: theme.spacing.sm, gap: 2 }}>
            {slices.map((s, i) => (
              <Pressable
                key={s.key}
                accessibilityRole="button"
                accessibilityLabel={`${s.name}, ${rs(s.value)}`}
                onPress={() => setActive(active === i ? null : i)}
                style={[styles.spread, { paddingVertical: 4 }]}>
                <View style={[styles.legendItem, { flex: 1 }]}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <Text style={[theme.typography.label, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                </View>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{rs(s.value)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

/** "Top 10 Products" — rank, product over category, revenue over qty sold (the web's phone list). */
export function TopTenProductsCard({ data }: { data: ReportTopProduct[] }) {
  const theme = useAppTheme();
  const rows = data.slice(0, 10);
  return (
    <Card>
      <CardTitle>Top 10 Products</CardTitle>
      {rows.length === 0 ? (
        <EmptyNote height={80}>No data yet</EmptyNote>
      ) : (
        rows.map((p, i) => (
          <View
            key={p.productId || p.productName}
            style={[styles.topRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 20 }]}>{i + 1}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                {p.productName}
              </Text>
              {p.categoryName ? (
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {p.categoryName}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{rs(p.totalRevenue)}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{p.totalQty.toLocaleString('en-US')} sold</Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}


const styles = StyleSheet.create({
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  readout: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'baseline', gap: 12 },
  yTick: { position: 'absolute', left: 0, width: Y_LABEL_W - 4, fontSize: 9, fontWeight: '600' },
  xTick: { position: 'absolute', width: 48, textAlign: 'center', fontSize: 10, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 8, borderRadius: 2 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
});
