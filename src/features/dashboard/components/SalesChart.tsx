import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { designType, HERO_CHIP, PRIMARY_GRADIENT, useAppTheme } from '@/shared/theme';
import { Card, HeroSurface } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { SalesAnalyticsDailyPoint } from '@/api';
import { barScalePct } from '../calculations';

export interface SalesChartProps {
  data: SalesAnalyticsDailyPoint[];
  /** The reference line drawn across the chart and the "Avg per day" figure — `averageDailySales` from `/sales-analytics`. */
  average?: number;
  /** Heading inside the card; `null` hides it (when a section header outside already names the chart). */
  title?: string | null;
  /** Draw it on the violet hero (like the Sales card) instead of a plain card — the home "Last 7 days". */
  hero?: boolean;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `Sun 11` for the selected-day pill; the plain ISO date if it can't be parsed. */
function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${WEEKDAY[d.getDay()]} ${d.getDate()}`;
}

/** Bar label: the weekday for a week or less of bars, else the day of the month. */
function barLabel(iso: string, count: number): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return count <= 7 ? WEEKDAY[d.getDay()] : String(d.getDate());
}

/**
 * Redesign B03 "Last 7 days" bar card (CLAUDE.md §14 — touch-interactive:
 * tap a bar for its day's revenue and orders). Lavender bars with the
 * selected day raised in saffron; it starts on the best day, like the mockup.
 */
export function SalesChart({ data, average = 0, title = 'Daily Sales', hero = false }: SalesChartProps) {
  const theme = useAppTheme();
  // Non-finite values are left out of the scale (never `Math.max(…, NaN)` = NaN for every bar).
  const highestSales = Math.max(1, ...data.map((d) => (Number.isFinite(d.sales) ? d.sales : 0)));
  const bestIndex = Math.max(0, data.findIndex((d) => d.sales === highestSales));
  const [picked, setPicked] = useState<number | null>(null);
  const selectedIndex = picked !== null && picked < data.length ? picked : bestIndex;
  const maxSales = Number.isFinite(average) ? Math.max(highestSales, average) : highestSales;
  const selected = data[selectedIndex];
  const averageLineBottomPct = average > 0 ? Math.min(96, barScalePct(average, maxSales)) : null;
  // On the violet hero everything is white / frosted, in both modes.
  const ink = hero ? HERO_CHIP.text : theme.colors.text;
  const faint = hero ? HERO_CHIP.textMuted : theme.colors.textFaint;
  const idleBar = hero ? 'rgba(255, 255, 255, 0.28)' : theme.isDark ? theme.colors.border : '#E4E1FB';
  const pillBg = hero ? HERO_CHIP.fill : theme.isDark ? theme.colors.border : '#EFEBFF';
  const pillInk = hero ? HERO_CHIP.text : theme.isDark ? theme.colors.text : '#5B48D8';
  // The saffron gradient is the default (orange) accent's look; other accents keep a flat primary bar.
  const gradientBar = theme.accent === 'orange';
  const Surface = hero ? HeroSurface : Card;
  // A week of bars gets the mockup's 8pt gaps; a month or more (Admin's ranges) packs tighter.
  const gap = data.length <= 14 ? 8 : data.length <= 31 ? 3 : 1;
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <Surface style={styles.card} {...(hero ? { plain: true } : null)}>
      {title ? <Text style={[designType.h3, { color: ink }]}>{title}</Text> : null}
      <View style={styles.headerRow}>
        <View style={styles.avgCol}>
          <Text style={[designType.xs, { color: faint }]}>Avg per day</Text>
          <Text style={[designType.h3, { color: ink }]} numberOfLines={1}>
            {formatCurrency(average, 'averageDailySales')}
          </Text>
        </View>
        {selected ? (
          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            <Text style={[styles.pillText, { color: pillInk }]} numberOfLines={1}>
              {shortDay(selected.date)} · {formatCurrency(selected.sales, 'daily.sales')}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.chart, { gap }]}>
        {averageLineBottomPct !== null ? (
          <View pointerEvents="none" style={[styles.averageLine, { bottom: `${averageLineBottomPct}%`, borderColor: faint }]} />
        ) : null}
        {data.map((point, index) => {
          const heightPct = `${Math.max(3, barScalePct(point.sales, maxSales))}%` as const;
          const active = index === selectedIndex;
          return (
            <Pressable
              key={point.date}
              onPress={() => setPicked(index)}
              style={styles.barColumn}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${formatDisplayDate(point.date)}, ${formatCurrency(point.sales, 'daily.sales')}, ${formatCount(point.transactions, 'daily.transactions')} orders${
                point.sales === highestSales ? ', highest' : ''
              }`}>
              {active && gradientBar ? (
                <LinearGradient colors={[...PRIMARY_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.bar, styles.barGlow, { height: heightPct }]} />
              ) : (
                <View style={[styles.bar, { height: heightPct, backgroundColor: active ? theme.colors.primary : idleBar }]} />
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.labelsRow, { gap }]}>
        {data.map((point, index) => (
          <Text key={point.date} style={[styles.label, { color: faint }]} numberOfLines={1}>
            {(data.length - 1 - index) % labelEvery === 0 ? barLabel(point.date, data.length) : ''}
          </Text>
        ))}
      </View>
      {selected ? (
        <Text style={[designType.xs, { color: faint }]}>
          {formatDisplayDate(selected.date)} · {formatCount(selected.transactions, 'daily.transactions')} orders · tap a bar for its day
        </Text>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  avgCol: { flexShrink: 1, gap: 2 },
  pill: { height: 24, paddingHorizontal: 10, borderRadius: 12, justifyContent: 'center', flexShrink: 1 },
  pillText: { fontSize: 11, fontWeight: '600' },
  chart: { height: 110, flexDirection: 'row', alignItems: 'flex-end' },
  averageLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  barColumn: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  barGlow: { shadowColor: '#F2542D', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 4 },
  labelsRow: { flexDirection: 'row', marginTop: -6 },
  label: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', overflow: 'visible' },
});
