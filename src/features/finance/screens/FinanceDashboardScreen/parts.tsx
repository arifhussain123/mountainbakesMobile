import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors as fin } from '@/finance/theme';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { formatMoney2, moneyWords } from '../../utils/financeFormat';
import { balanceMeaning } from '../../utils/dashboardModel';

/**
 * The dashboard's series colours — design UIandUX/mountainbakesFinance.html
 * screen 01, already the Finance palette (`@/finance/theme`). One colour per
 * figure everywhere on the screen, so a bar, a line and a tile of the same
 * figure always match. `*Legend` is the lighter tint the mock uses for text.
 */
export const SERIES = {
  demand: fin.textMuted,
  share: fin.incomeBar,
  shareLegend: fin.incomeBarLegend,
  received: fin.receivedBar,
  ledger: fin.expenseBar,
  ledgerLegend: fin.expenseBarLegend,
  returns: fin.income,
  discount: fin.info,
} as const;

/** Header bands: Income purple, Expense brown, the ledger's navy. Text on them is always the light ink. */
export const BAND = { income: fin.incomeHeader, expense: fin.expenseHeader, overall: fin.navyCard, ink: fin.text, inkMuted: '#D9D2F5' } as const;

/** Money that never clips: shrinks to 85% before it would, and reads as words to a screen reader. */
export function Money({
  value,
  style,
  signed,
  nullLabel = 'No records',
}: {
  value: number | null;
  style?: StyleProp<TextStyle>;
  /** Negative values in the danger colour (always with words elsewhere — never colour alone). */
  signed?: boolean;
  nullLabel?: string;
}) {
  const theme = useAppTheme();
  const negative = signed && value !== null && value < 0;
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      style={[styles.money, { color: value === null ? theme.colors.textSecondary : negative ? theme.colors.danger : theme.colors.text }, style]}>
      {value === null ? nullLabel : formatMoney2(value)}
    </Text>
  );
}

/** "Balance 40,735.00 rupees, owed" — the server's meaning in words, so red is never the only signal. */
export function balanceWords(label: string, value: number | null): string {
  if (value === null) return `${label}, no records`;
  const meaning = balanceMeaning(value);
  return `${label} ${moneyWords(Math.abs(value))}${meaning === 'owed' ? ', owed to the company' : meaning === 'overpaid' ? ', overpaid' : ', settled'}`;
}

/** A titled card — uppercase eyebrow like the mock, optional aside on the right. */
export function Panel({ title, aside, children, style }: { title: string; aside?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return (
    <Card style={[{ marginBottom: theme.spacing.md }, style]}>
      <View style={styles.panelHead}>
        <Text accessibilityRole="header" style={[styles.eyebrow, { color: theme.colors.textSecondary, flexShrink: 1 }]}>
          {title.toUpperCase()}
        </Text>
        {aside}
      </View>
      <View style={{ marginTop: theme.spacing.md }}>{children}</View>
    </Card>
  );
}

/** A full-bleed coloured header band over a card's body (INCOME / EXPENSES). */
export function BandCard({ title, color, right, children }: { title: string; color: string; right?: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.bandCard, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.lg, marginBottom: theme.spacing.md }]}>
      <View style={[styles.band, { backgroundColor: color }]}>
        <Text accessibilityRole="header" style={[styles.bandTitle, { color: BAND.ink }]}>
          {title}
        </Text>
        {right ? (
          <Text numberOfLines={1} style={[styles.bandRight, { color: BAND.inkMuted }]}>
            {right}
          </Text>
        ) : null}
      </View>
      <View style={{ padding: theme.spacing.md }}>{children}</View>
    </View>
  );
}

/** A KPI tile: colour square + label, the amount, a sub-line. Tappable when it has source records. */
export function Tile({
  label,
  value,
  sub,
  color,
  signed,
  onPress,
  accessibilityLabel,
  compactText,
}: {
  label: string;
  value: number | null;
  sub: string;
  color: string;
  signed?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Three across on a phone — smaller type. */
  compactText?: boolean;
}) {
  const theme = useAppTheme();
  const body = (
    <>
      <View style={styles.tileLabelRow}>
        <View style={[styles.swatch, { backgroundColor: color }]} />
        <Text numberOfLines={1} style={[styles.tileLabel, { color: theme.colors.textSecondary, fontSize: compactText ? 9 : 10 }]}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Money value={value} signed={signed} style={{ fontSize: compactText ? 13 : 15, marginTop: 6 }} />
      <Text numberOfLines={2} style={[styles.tileSub, { color: theme.colors.textFaint }]}>
        {sub}
      </Text>
    </>
  );
  const style = [styles.tile, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }];
  const a11y = accessibilityLabel ?? `${label} ${value === null ? 'no records' : moneyWords(value)}, ${sub}`;
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint="Opens the source records"
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && { opacity: 0.7 }]}>
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={a11y} style={style}>
      {body}
    </View>
  );
}

/** Bars on one shared scale — Income vs Expense and the ledger head breakdown. */
export interface BarRow {
  key: string;
  label: string;
  /** Small caption beside the label (INCOME / EXPENSE) or under it (entries · %). */
  caption?: string;
  captionBelow?: boolean;
  value: number;
  color: string;
  onPress?: () => void;
}

export function BarList({ rows, emptyMessage }: { rows: BarRow[]; emptyMessage: string }) {
  const theme = useAppTheme();
  const max = Math.max(0, ...rows.map((r) => Math.abs(r.value)));
  if (max === 0) return <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{emptyMessage}</Text>;
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => {
        const width = `${Math.max(1.5, (Math.abs(r.value) / max) * 100)}%` as const;
        const body = (
          <>
            <View style={styles.barHead}>
              <Text numberOfLines={1} style={[styles.barLabel, { color: theme.colors.text }]}>
                {r.label}
                {r.caption && !r.captionBelow ? <Text style={[styles.barCaption, { color: theme.colors.textFaint }]}>{`  ${r.caption}`}</Text> : null}
              </Text>
              <Money value={r.value} style={styles.barValue} />
            </View>
            {r.caption && r.captionBelow ? <Text style={[styles.barCaption, { color: theme.colors.textFaint, marginTop: 1 }]}>{r.caption}</Text> : null}
            <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.fill, { width, backgroundColor: r.color }]} />
            </View>
          </>
        );
        const a11y = `${r.label}${r.caption ? `, ${r.caption}` : ''}, ${moneyWords(r.value)}`;
        return r.onPress ? (
          <Pressable key={r.key} accessibilityRole="button" accessibilityLabel={a11y} accessibilityHint="Opens the source records" onPress={r.onPress} hitSlop={4}>
            {body}
          </Pressable>
        ) : (
          <View key={r.key} accessible accessibilityLabel={a11y}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

/** Daily / Weekly / Monthly. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const theme = useAppTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.segmented, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.sm }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, { backgroundColor: active ? theme.colors.text : 'transparent', borderRadius: theme.radii.sm - 2 }]}>
            <Text style={[styles.segmentText, { color: active ? theme.colors.background : theme.colors.textSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A colour key under a chart. `dash` draws the swatch as a line style hint. */
export function Legend({ items }: { items: { label: string; color: string; line?: 'solid' | 'dashed' | 'dotted' }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <Text key={i.label} style={[styles.legendText, { color: i.color }]}>
          {i.line === 'dashed' ? '- - ' : i.line === 'dotted' ? '··· ' : i.line ? '— ' : '■ '}
          {i.label}
        </Text>
      ))}
    </View>
  );
}

/** ‹ › buttons that move a chart's selection — the tooltip is reachable without dragging. */
export function StepButtons({ onPrev, onNext, prevDisabled, nextDisabled, what }: { onPrev: () => void; onNext: () => void; prevDisabled: boolean; nextDisabled: boolean; what: string }) {
  const theme = useAppTheme();
  const btn = (label: string, icon: string, onPress: () => void, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[styles.step, { borderColor: theme.colors.cardBorder, opacity: disabled ? 0.35 : 1 }]}>
      <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700' }}>{icon}</Text>
    </Pressable>
  );
  return (
    <View style={styles.steps}>
      {btn(`Previous ${what}`, '‹', onPrev, prevDisabled)}
      {btn(`Next ${what}`, '›', onNext, nextDisabled)}
    </View>
  );
}

export const styles = StyleSheet.create({
  money: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  bandCard: { borderWidth: 1, overflow: 'hidden' },
  band: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  bandTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  bandRight: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  tile: { flex: 1, minWidth: 0, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 10 },
  tileLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  tileLabel: { fontWeight: '700', letterSpacing: 0.8, flexShrink: 1 },
  tileSub: { fontSize: 10, marginTop: 2 },
  barHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  barLabel: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  barCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  barValue: { fontSize: 12, flexShrink: 0, maxWidth: '55%' },
  track: { height: 7, borderRadius: 4, marginTop: 5, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  segmented: { flexDirection: 'row', borderWidth: 1, padding: 2 },
  segment: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentText: { fontSize: 12, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, marginTop: 10 },
  legendText: { fontSize: 11, fontWeight: '600' },
  steps: { flexDirection: 'row', gap: 6 },
  step: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
