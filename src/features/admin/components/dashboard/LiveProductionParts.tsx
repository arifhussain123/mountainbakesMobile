import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { ProductionDashboardDelta } from '@/api/types';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, LoadingSkeleton } from '@/shared/ui';
import { deltaDisplay, fmtUnits, heatCell, shortBranch, type PlanTone } from '../../utils/dashboardGaps';
import { SmallButton } from './parts';

/**
 * The embedded Production Dashboard's building blocks (`production/dashboard/parts.tsx`)
 * for a phone: a KPI tile with its ⓘ definition, the delta pill, legends,
 * a section frame with its own loading / error / empty states, the heat grid
 * and the branch cards' sparkline.
 */

function useToneColor(tone: PlanTone | 'flat' | 'accent'): string {
  const { colors } = useAppTheme();
  return { good: colors.success, warn: colors.warning, bad: colors.danger, flat: colors.textSecondary, accent: colors.primary }[tone];
}

/** A small rounded tone label — the plan's covered / from stock / short badges. */
export function ToneBadge({ tone, label }: { tone: PlanTone | 'accent'; label: string }) {
  const color = useToneColor(tone);
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1F` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/** Change against the same stretch of the previous period; nothing at all with nothing to compare. */
export function DeltaPill({ delta, versus, invert }: { delta: ProductionDashboardDelta | null | undefined; versus: string; invert?: boolean }) {
  const d = deltaDisplay(delta, invert);
  const color = useToneColor(d?.tone ?? 'flat');
  if (!d) return null;
  return (
    <View accessible accessibilityLabel={`${d.text} against ${versus}`} style={[styles.badge, { backgroundColor: `${color}1F` }]}>
      <Text style={[styles.badgeText, { color }]}>{d.text}</Text>
    </View>
  );
}

/** One figure, with the ⓘ that reads out what it means (the web's hover `definition`). */
export function SectionKpi({
  name,
  value,
  note,
  delta,
  definition,
  size = 'sm',
}: {
  name: string;
  value: string;
  note?: string;
  delta?: ReactNode;
  definition?: string;
  size?: 'sm' | 'lg';
}) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.kpi,
        {
          backgroundColor: size === 'lg' ? theme.colors.cardFill : theme.colors.background,
          borderColor: theme.colors.cardBorder,
          borderRadius: theme.radii.lg,
        },
      ]}>
      <View style={styles.kpiHead}>
        <View style={styles.kpiName}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', flexShrink: 1 }]}>{name}</Text>
          {definition ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`What ${name} means`}
              hitSlop={10}
              onPress={() => Alert.alert(name, definition)}>
              <Icon name="info" size={13} color={theme.colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
        {delta}
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[size === 'lg' ? styles.valueLg : styles.valueSm, { color: theme.colors.text }]}>
        {value}
      </Text>
      {note ? (
        <Text numberOfLines={2} style={[theme.typography.label, { color: theme.colors.textFaint }]}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** Two tiles a row; an odd last tile takes the full width. */
export function KpiRow({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/** Colour key: a swatch per series, or a short bar for a line. */
export function ChartLegend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  const theme = useAppTheme();
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View style={[it.line ? styles.legendLine : styles.legendSwatch, { backgroundColor: it.color }]} />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** An upper-case caption above a list or chart inside a section. */
export function Caption({ text }: { text: string }) {
  const theme = useAppTheme();
  return <Text style={[styles.caption, { color: theme.colors.textSecondary }]}>{text.toUpperCase()}</Text>;
}

/** The query fields a section needs to draw its states. */
export interface SectionQueryState {
  data: unknown;
  isLoading: boolean;
  error: unknown;
  isFetching: boolean;
  isPlaceholderData: boolean;
  refetch: () => unknown;
}

/**
 * One dashboard section: its card, title, one-line subtitle, KPI row and body,
 * with its own loading, error and empty states — one that fails leaves the
 * others standing, as on the web.
 */
export function SectionShell({
  title,
  subtitle,
  query,
  kpis,
  empty,
  emptyText,
  children,
  right,
}: {
  title: string;
  subtitle: string;
  query: SectionQueryState;
  kpis: () => ReactNode;
  empty: boolean;
  emptyText: string;
  children: () => ReactNode;
  right?: ReactNode;
}) {
  const theme = useAppTheme();
  const { data, isLoading, error, isFetching, isPlaceholderData, refetch } = query;
  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" style={[theme.typography.cardTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
        </View>
        {right}
      </View>
      {isLoading ? (
        <LoadingSkeleton height={220} borderRadius={12} />
      ) : error && !data ? (
        <View accessibilityRole="alert" style={[styles.failed, { borderColor: theme.colors.danger }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, fontWeight: '700' }]}>This section could not be loaded</Text>
          <SmallButton label={isFetching ? 'Retrying…' : 'Retry'} icon="refresh" onPress={() => void refetch()} />
        </View>
      ) : data ? (
        <View style={{ gap: 12, opacity: isPlaceholderData ? 0.6 : 1 }}>
          {error ? (
            <View style={styles.stale}>
              <Text style={[theme.typography.label, { color: theme.colors.warning, flex: 1 }]}>Showing the last figures; the refresh failed.</Text>
              <SmallButton label="Retry" icon="refresh" onPress={() => void refetch()} />
            </View>
          ) : null}
          {kpis()}
          {empty ? (
            <View style={[styles.empty, { borderColor: theme.colors.border }]}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center' }]}>{emptyText}</Text>
            </View>
          ) : (
            children()
          )}
        </View>
      ) : null}
    </Card>
  );
}

/** Ranked products with a bar each — Received demand's top 5, Repaired stock's top 10. */
export function RankedUnits({ rows, color }: { rows: { productId: string | null; productName: string; units: number }[]; color: string }) {
  const theme = useAppTheme();
  const max = Math.max(1, ...rows.map((r) => r.units));
  return (
    <View style={{ gap: 9 }}>
      {rows.map((p, i) => (
        <View key={p.productId ?? p.productName} style={{ gap: 4 }}>
          <View style={styles.rankHead}>
            <Text style={[theme.typography.label, { color: theme.colors.textFaint, width: 16 }]}>{i + 1}</Text>
            <Text numberOfLines={1} style={[theme.typography.label, { color: theme.colors.text, fontWeight: '600', flex: 1 }]}>
              {p.productName}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '800' }]}>{fmtUnits(p.units)}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
            <View style={{ width: `${Math.max((p.units / max) * 100, 3)}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Branch × product grid, darker where larger, in one colour; the other
 * branches dim under a branch filter so the chosen one reads against them.
 * Scrolls sideways past what the screen holds.
 */
export function HeatGrid({
  products,
  rows,
  color,
  selectedId,
  label,
}: {
  products: { productId: string | null; productName: string }[];
  rows: { branchId: string; branchName: string; values: number[] }[];
  color: string;
  selectedId: string | null;
  label: string;
}) {
  const theme = useAppTheme();
  if (rows.length === 0 || products.length === 0) {
    return <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No data yet</Text>;
  }
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={label}>
      <View>
        <View style={styles.heatRow}>
          <View style={styles.heatName} />
          {products.map((p) => (
            <Text key={p.productId ?? p.productName} numberOfLines={2} style={[styles.heatHead, { color: theme.colors.textSecondary }]}>
              {p.productName}
            </Text>
          ))}
        </View>
        {rows.map((r) => (
          <View key={r.branchId} style={[styles.heatRow, { opacity: selectedId && selectedId !== r.branchId ? 0.3 : 1 }]}>
            <Text numberOfLines={1} style={[styles.heatName, theme.typography.label, { color: theme.colors.text, fontWeight: '600' }]}>
              {shortBranch(r.branchName)}
            </Text>
            {r.values.map((v, i) => {
              const cell = heatCell(v, max);
              return (
                <View key={i} style={[styles.heatCell, { backgroundColor: v > 0 ? color : theme.colors.border }]}>
                  {v > 0 ? <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.cardFill, opacity: 1 - cell.alpha, borderRadius: 6 }]} /> : null}
                  <Text style={[styles.heatValue, { color: cell.strong ? '#FFFFFF' : v > 0 ? theme.colors.text : theme.colors.textFaint }]}>
                    {v > 0 ? fmtUnits(v) : '–'}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/** A tiny line of one series for a branch card; flat and muted when there is nothing in it. */
export function Sparkline({ values, color, width = 80, height = 24 }: { values: number[]; color: string; width?: number; height?: number }) {
  const theme = useAppTheme();
  const n = values.length;
  if (n === 0) return null;
  const max = Math.max(...values, 0);
  const pts = values.map((v, i) => {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * (width - 4) + 2;
    const yy = max > 0 ? height - 3 - (v / max) * (height - 6) : height - 3;
    return [x, yy] as const;
  });
  const last = pts[pts.length - 1]!;
  return (
    <Svg width={width} height={height}>
      <Polyline points={pts.map(([x, yy]) => `${x.toFixed(1)},${yy.toFixed(1)}`).join(' ')} fill="none" stroke={max > 0 ? color : theme.colors.border} strokeWidth={2} />
      {max > 0 ? <Circle cx={last[0]} cy={last[1]} r={2.5} fill={color} /> : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { flexBasis: '45%', flexGrow: 1, minWidth: 0, borderWidth: 1, padding: 12, gap: 4 },
  kpiHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  kpiName: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  valueLg: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  valueSm: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 9, height: 9, borderRadius: 2 },
  legendLine: { width: 14, height: 3, borderRadius: 2 },
  caption: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  failed: { alignItems: 'center', gap: 10, paddingVertical: 24, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12 },
  stale: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  empty: { alignItems: 'center', justifyContent: 'center', minHeight: 120, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 16 },
  rankHead: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  heatName: { width: 96 },
  heatHead: { width: 58, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  heatCell: { width: 58, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heatValue: { fontSize: 11.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
