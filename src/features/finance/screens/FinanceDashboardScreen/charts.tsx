import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { FinanceDashboardMonthTrend } from '@/api/types';
import { colors as fin } from '@/finance/theme';
import { useAppTheme } from '@/shared/theme';
import { formatMoney2, moneyWords } from '../../utils/financeFormat';
import { balanceMeaning, compact, dayLabel, monthLong, monthShort, niceCeil, type BranchTotals, type DailyPoint } from '../../utils/dashboardModel';
import { Legend, Money, Panel, SERIES, StepButtons, balanceWords } from './parts';

/**
 * The dashboard's five charts, drawn with react-native-svg. Each one keeps a
 * selected point whose exact figures sit in a readout above the plot — tap a
 * column to move it, or use the ‹ › buttons, so nothing needs a drag gesture
 * (and a screen reader reaches every value). The daily charts scroll sideways
 * rather than squeezing 31 days into 320dp.
 */

const PLOT_H = 150;
const TOP = 8;
const AXIS_W = 34;
/** Width of one day on the daily charts. */
const SLOT = 22;

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

/** The latest day that has anything, else the last day. */
function lastActive<T>(rows: T[], has: (r: T) => boolean): number {
  for (let i = rows.length - 1; i >= 0; i--) if (has(rows[i]!)) return i;
  return Math.max(0, rows.length - 1);
}

function linePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

/** The fixed y-axis column beside a scrolling plot: max, half, zero (and a negative floor when there is one). */
function YAxis({ max, min, height }: { max: number; min: number; height: number }) {
  const theme = useAppTheme();
  const y = (v: number) => TOP + ((max - v) / (max - min || 1)) * (height - TOP);
  const ticks = min < 0 ? [max, 0, min] : [max, max / 2, 0];
  return (
    <Svg width={AXIS_W} height={height + 14}>
      {ticks.map((t) => (
        <SvgText key={t} x={AXIS_W - 4} y={y(t) + 3} fontSize={9} fill={theme.colors.textFaint} textAnchor="end">
          {compact(t)}
        </SvgText>
      ))}
    </Svg>
  );
}

function Readout({ title, rows, action }: { title: string; rows: { label: string; value: number; color: string; words?: string }[]; action?: { label: string; onPress: () => void } }) {
  const theme = useAppTheme();
  return (
    <View
      accessible={!action}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}. ${rows.map((r) => r.words ?? `${r.label} ${moneyWords(r.value)}`).join('. ')}`}
      style={[styles.readout, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
      <View style={styles.readoutHead}>
        <Text style={[styles.readoutTitle, { color: theme.colors.text }]}>{title}</Text>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
            <Text style={[styles.readoutAction, { color: fin.accent }]}>{action.label} ›</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.readoutGrid}>
        {rows.map((r) => (
          <View key={r.label} style={styles.readoutCell}>
            <Text numberOfLines={1} style={[styles.readoutLabel, { color: r.color }]}>
              {r.label}
            </Text>
            <Money value={r.value} signed={r.label === 'Balance' || r.label === 'Difference'} style={{ fontSize: 12 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Company Share vs Received · daily
// ---------------------------------------------------------------------------

export const DailyShareReceivedChart = memo(function DailyShareReceivedChart({ data, onViewDemands }: { data: DailyPoint[]; onViewDemands: (date: string) => void }) {
  const theme = useAppTheme();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState(() => lastActive(data, (d) => d.companyShare > 0 || d.received > 0));
  const max = useMemo(() => niceCeil(Math.max(0, ...data.map((d) => Math.max(d.companyShare, d.received)))), [data]);
  const empty = max === 0;
  const plotW = Math.max(width - AXIS_W, data.length * SLOT);
  const slot = data.length ? plotW / data.length : SLOT;
  const y = (v: number) => TOP + (1 - v / (max || 1)) * (PLOT_H - TOP);
  const bw = Math.max(3, (slot - 6) / 2);
  const d = data[Math.min(sel, data.length - 1)];

  return (
    <Panel title="Company Share vs Received · daily" aside={<StepButtons what="day" onPrev={() => setSel((i) => Math.max(0, i - 1))} onNext={() => setSel((i) => Math.min(data.length - 1, i + 1))} prevDisabled={sel <= 0} nextDisabled={sel >= data.length - 1} />}>
      <Text style={[styles.hint, { color: theme.colors.textFaint }]}>Tap a day for its demand</Text>
      {empty ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No company share or receipts in this date range.</Text>
      ) : (
        <>
          {d ? (
            <Readout
              title={`${dayLabel(d.date)} ${d.date.slice(0, 4)}`}
              rows={[
                { label: 'Company Share', value: d.companyShare, color: SERIES.shareLegend },
                { label: 'Received', value: d.received, color: SERIES.received },
                {
                  label: 'Difference',
                  value: d.companyShare - d.received,
                  color: theme.colors.textSecondary,
                  words: balanceWords('Difference', Math.round((d.companyShare - d.received) * 100) / 100),
                },
              ]}
              action={d.companyShare > 0 ? { label: 'View demands', onPress: () => onViewDemands(d.date) } : undefined}
            />
          ) : null}
          <View style={styles.chartRow} onLayout={onLayout}>
            <YAxis max={max} min={0} height={PLOT_H} />
            {width > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: Math.max(0, sel * slot - (width - AXIS_W) / 2), y: 0 }}>
                <Svg width={plotW} height={PLOT_H + 14}>
                  {[max, max / 2].map((t) => (
                    <Line key={t} x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={theme.colors.border} strokeDasharray="3 4" />
                  ))}
                  <Line x1={0} x2={plotW} y1={y(0)} y2={y(0)} stroke={theme.colors.textFaint} strokeWidth={0.8} />
                  {data.map((p, i) => {
                    const x = i * slot;
                    const active = i === sel;
                    return (
                      <G key={p.date} onPress={() => setSel(i)}>
                        <Rect x={x} y={0} width={slot} height={PLOT_H + 14} fill={active ? theme.colors.border : 'transparent'} />
                        {p.companyShare > 0 ? <Rect x={x + 3} y={y(p.companyShare)} width={bw} height={y(0) - y(p.companyShare)} rx={1.5} fill={SERIES.share} /> : null}
                        {p.received > 0 ? <Rect x={x + 3 + bw} y={y(p.received)} width={bw} height={y(0) - y(p.received)} rx={1.5} fill={SERIES.received} /> : null}
                        {i % 7 === 0 || i === data.length - 1 || active ? (
                          <SvgText x={x + slot / 2} y={PLOT_H + 11} fontSize={9} fontWeight={active ? '700' : '400'} fill={active ? theme.colors.text : theme.colors.textFaint} textAnchor="middle">
                            {p.label}
                          </SvgText>
                        ) : null}
                      </G>
                    );
                  })}
                </Svg>
              </ScrollView>
            ) : null}
          </View>
          <Legend items={[{ label: 'Company Share', color: SERIES.shareLegend }, { label: 'Received', color: SERIES.received }]} />
        </>
      )}
    </Panel>
  );
});

// ---------------------------------------------------------------------------
// Monthly income trend · 6 months
// ---------------------------------------------------------------------------

export const MonthlyTrendChart = memo(function MonthlyTrendChart({ data, current }: { data: FinanceDashboardMonthTrend[]; current: string }) {
  const theme = useAppTheme();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState(() => Math.max(0, data.findIndex((m) => m.month === current)));
  const values = data.flatMap((m) => [m.demand, m.companyShare, m.received, m.balance]);
  const max = niceCeil(Math.max(0, ...values));
  const min = -niceCeil(Math.max(0, ...values.map((v) => -v)));
  const plotW = Math.max(0, width - AXIS_W);
  const step = data.length > 1 ? (plotW - 24) / (data.length - 1) : 0;
  const x = (i: number) => 12 + i * step;
  const y = (v: number) => TOP + ((max - v) / (max - min || 1)) * (PLOT_H - TOP);
  const m = data[Math.min(sel, data.length - 1)];
  const series: { key: keyof FinanceDashboardMonthTrend; color: string; dash?: string }[] = [
    { key: 'demand', color: SERIES.demand },
    { key: 'companyShare', color: SERIES.shareLegend },
    { key: 'received', color: SERIES.received },
    { key: 'balance', color: theme.colors.text, dash: '4 3' },
  ];

  return (
    <Panel title="Monthly income trend · 6 months" aside={<StepButtons what="month" onPrev={() => setSel((i) => Math.max(0, i - 1))} onNext={() => setSel((i) => Math.min(data.length - 1, i + 1))} prevDisabled={sel <= 0} nextDisabled={sel >= data.length - 1} />}>
      {m ? (
        <Readout
          title={monthLong(m.month)}
          rows={[
            { label: 'Demand', value: m.demand, color: theme.colors.textSecondary },
            { label: 'Company Share', value: m.companyShare, color: SERIES.shareLegend },
            { label: 'Received', value: m.received, color: SERIES.received },
            { label: 'Balance', value: m.balance, color: theme.colors.text, words: balanceWords('Balance', m.balance) },
          ]}
        />
      ) : null}
      <View style={styles.chartRow} onLayout={onLayout}>
        <YAxis max={max} min={min} height={PLOT_H} />
        {plotW > 0 ? (
          <Svg width={plotW} height={PLOT_H + 14}>
            {data.map((p, i) => (
              <Rect key={p.month} x={x(i) - step / 2} y={0} width={step || plotW} height={PLOT_H + 14} fill={i === sel ? theme.colors.border : 'transparent'} onPress={() => setSel(i)} />
            ))}
            <Line x1={0} x2={plotW} y1={y(max)} y2={y(max)} stroke={theme.colors.border} strokeDasharray="3 4" />
            {min < 0 ? <Line x1={0} x2={plotW} y1={y(min)} y2={y(min)} stroke={theme.colors.border} strokeDasharray="3 4" /> : null}
            <Line x1={0} x2={plotW} y1={y(0)} y2={y(0)} stroke={theme.colors.textFaint} strokeWidth={1} />
            {series.map((sr) => (
              <Path
                key={sr.key}
                d={linePath(data.map((p, i) => ({ x: x(i), y: y(p[sr.key] as number) })))}
                stroke={sr.color}
                strokeWidth={2}
                strokeDasharray={sr.dash}
                fill="none"
                pointerEvents="none"
              />
            ))}
            {data.map((p, i) => (
              <SvgText key={p.month} x={x(i)} y={PLOT_H + 11} fontSize={9} fontWeight={p.month === current || i === sel ? '700' : '400'} fill={i === sel ? theme.colors.text : theme.colors.textFaint} textAnchor="middle">
                {monthShort(p.month).slice(0, 3)}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>
      <Legend
        items={[
          { label: 'Demand', color: theme.colors.textSecondary, line: 'solid' },
          { label: 'Company Share', color: SERIES.shareLegend, line: 'solid' },
          { label: 'Received', color: SERIES.received, line: 'solid' },
          { label: 'Balance', color: theme.colors.text, line: 'dashed' },
        ]}
      />
    </Panel>
  );
});

// ---------------------------------------------------------------------------
// Expense trend · daily
// ---------------------------------------------------------------------------

export const ExpenseTrendChart = memo(function ExpenseTrendChart({ data }: { data: DailyPoint[] }) {
  const theme = useAppTheme();
  const [width, onLayout] = useWidth();
  const [sel, setSel] = useState(() => lastActive(data, (d) => d.ledger > 0 || d.returns > 0 || d.discount > 0));
  const max = useMemo(() => niceCeil(Math.max(0, ...data.flatMap((d) => [d.ledger, d.returns, d.discount]))), [data]);
  const plotW = Math.max(width - AXIS_W, data.length * SLOT);
  const slot = data.length ? plotW / data.length : SLOT;
  const x = (i: number) => i * slot + slot / 2;
  const y = (v: number) => TOP + (1 - v / (max || 1)) * (PLOT_H - TOP);
  const d = data[Math.min(sel, data.length - 1)];
  const series: { key: 'ledger' | 'returns' | 'discount'; color: string; dash?: string }[] = [
    { key: 'ledger', color: SERIES.ledgerLegend },
    { key: 'returns', color: SERIES.returns, dash: '5 3' },
    { key: 'discount', color: SERIES.discount, dash: '1.5 3' },
  ];

  return (
    <Panel title="Expense trend · daily" aside={<StepButtons what="day" onPrev={() => setSel((i) => Math.max(0, i - 1))} onNext={() => setSel((i) => Math.min(data.length - 1, i + 1))} prevDisabled={sel <= 0} nextDisabled={sel >= data.length - 1} />}>
      {max === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No ledger expense, return or discount in this date range.</Text>
      ) : (
        <>
          {d ? (
            <Readout
              title={`${dayLabel(d.date)} ${d.date.slice(0, 4)}`}
              rows={[
                { label: 'Ledger expense', value: d.ledger, color: SERIES.ledgerLegend },
                { label: 'Return', value: d.returns, color: SERIES.returns },
                { label: 'Discount', value: d.discount, color: SERIES.discount },
              ]}
            />
          ) : null}
          <View style={styles.chartRow} onLayout={onLayout}>
            <YAxis max={max} min={0} height={PLOT_H} />
            {width > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: Math.max(0, sel * slot - (width - AXIS_W) / 2), y: 0 }}>
                <Svg width={plotW} height={PLOT_H + 14}>
                  {data.map((p, i) => (
                    <Rect key={p.date} x={i * slot} y={0} width={slot} height={PLOT_H + 14} fill={i === sel ? theme.colors.border : 'transparent'} onPress={() => setSel(i)} />
                  ))}
                  <Line x1={0} x2={plotW} y1={y(max)} y2={y(max)} stroke={theme.colors.border} strokeDasharray="3 4" />
                  <Line x1={0} x2={plotW} y1={y(0)} y2={y(0)} stroke={theme.colors.textFaint} strokeWidth={0.8} />
                  {series.map((sr) => (
                    <Path key={sr.key} d={linePath(data.map((p, i) => ({ x: x(i), y: y(p[sr.key]) })))} stroke={sr.color} strokeWidth={1.8} strokeDasharray={sr.dash} fill="none" pointerEvents="none" />
                  ))}
                  {data.map((p, i) =>
                    i % 7 === 0 || i === data.length - 1 || i === sel ? (
                      <SvgText key={p.date} x={x(i)} y={PLOT_H + 11} fontSize={9} fontWeight={i === sel ? '700' : '400'} fill={i === sel ? theme.colors.text : theme.colors.textFaint} textAnchor="middle">
                        {p.label}
                      </SvgText>
                    ) : null,
                  )}
                </Svg>
              </ScrollView>
            ) : null}
          </View>
          <Legend
            items={[
              { label: 'Ledger expense', color: SERIES.ledgerLegend, line: 'solid' },
              { label: 'Return', color: SERIES.returns, line: 'dashed' },
              { label: 'Discount', color: SERIES.discount, line: 'dotted' },
            ]}
          />
        </>
      )}
    </Panel>
  );
});

// ---------------------------------------------------------------------------
// Branch comparison · income — negative balances extend left of zero
// ---------------------------------------------------------------------------

export const BranchIncomeChart = memo(function BranchIncomeChart({ rows, onBranch }: { rows: BranchTotals[]; onBranch: (b: BranchTotals) => void }) {
  const theme = useAppTheme();
  const shown = rows.filter((r) => r.companyShare || r.received);
  const pos = Math.max(0, ...shown.flatMap((r) => [r.companyShare, r.received, r.balance]));
  const neg = Math.max(0, ...shown.map((r) => -r.balance));
  const span = pos + neg || 1;
  const zero = (neg / span) * 100;
  const bar = (v: number, color: string) => {
    const w = (Math.abs(v) / span) * 100;
    return (
      <View style={styles.hTrack}>
        <View style={[styles.hBar, { backgroundColor: color, width: `${Math.max(v ? 0.8 : 0, w)}%`, left: v < 0 ? `${zero - w}%` : `${zero}%` }]} />
      </View>
    );
  };

  return (
    <Panel title="Branch comparison · income">
      <Text style={[styles.hint, { color: theme.colors.textFaint }]}>Tap a branch for its demand</Text>
      {shown.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No branch income in this period.</Text>
      ) : (
        <View style={{ gap: 14 }}>
          {shown.map((r) => {
            const meaning = balanceMeaning(r.balance);
            return (
              <Pressable
                key={r.branchId ?? 'none'}
                accessibilityRole="button"
                accessibilityLabel={`${r.branch}. Company share ${moneyWords(r.companyShare)}. Received ${moneyWords(r.received)}. ${balanceWords('Balance', r.balance)}.`}
                accessibilityHint="Opens this branch's demand"
                onPress={() => onBranch(r)}
                style={({ pressed }) => pressed && { opacity: 0.6 }}>
                <View style={styles.hHead}>
                  <Text numberOfLines={1} style={[styles.hName, { color: theme.colors.text }]}>
                    {r.branch}
                  </Text>
                  <Text numberOfLines={1} style={[styles.hValue, { color: r.balance < 0 ? theme.colors.danger : theme.colors.textSecondary }]}>
                    {formatMoney2(r.balance)}
                    {meaning === 'overpaid' ? ' overpaid' : meaning === 'owed' ? ' owed' : ''}
                  </Text>
                </View>
                <View style={{ gap: 3, marginTop: 5 }}>
                  {bar(r.companyShare, SERIES.share)}
                  {bar(r.received, SERIES.received)}
                  {bar(r.balance, r.balance < 0 ? theme.colors.danger : theme.colors.textSecondary)}
                  {neg > 0 ? <View pointerEvents="none" style={[styles.zeroLine, { left: `${zero}%`, backgroundColor: theme.colors.textFaint }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <Legend
        items={[
          { label: 'Company Share', color: SERIES.shareLegend },
          { label: 'Received', color: SERIES.received },
          { label: 'Balance', color: theme.colors.textSecondary },
        ]}
      />
    </Panel>
  );
});

// ---------------------------------------------------------------------------
// Branch comparison · expense — stacked
// ---------------------------------------------------------------------------

export const BranchExpenseChart = memo(function BranchExpenseChart({ rows }: { rows: BranchTotals[] }) {
  const theme = useAppTheme();
  const shown = rows.filter((r) => r.ledger || r.returns || r.discount);
  const max = Math.max(0, ...shown.map((r) => r.ledger + r.returns + r.discount)) || 1;
  return (
    <Panel title="Branch comparison · expense">
      {shown.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No expense in this period.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {shown.map((r) => (
            <View
              key={r.branchId ?? 'none'}
              accessible
              accessibilityLabel={`${r.branch}. Ledger expense ${moneyWords(r.ledger)}. Return ${moneyWords(r.returns)}. Discount ${moneyWords(r.discount)}.`}>
              <View style={styles.hHead}>
                <Text numberOfLines={1} style={[styles.hName, { color: theme.colors.text }]}>
                  {r.branch}
                </Text>
                <Text numberOfLines={1} style={[styles.hValue, { color: theme.colors.textSecondary }]}>
                  {formatMoney2(r.ledger + r.returns + r.discount)}
                </Text>
              </View>
              <View style={[styles.stack, { backgroundColor: theme.colors.border }]}>
                {(
                  [
                    [r.ledger, SERIES.ledger],
                    [r.returns, SERIES.returns],
                    [r.discount, SERIES.discount],
                  ] as const
                ).map(([v, c], i) => (v > 0 ? <View key={i} style={{ width: `${(v / max) * 100}%`, backgroundColor: c }} /> : null))}
              </View>
            </View>
          ))}
        </View>
      )}
      <Legend
        items={[
          { label: 'Ledger', color: SERIES.ledgerLegend },
          { label: 'Return', color: SERIES.returns },
          { label: 'Discount', color: SERIES.discount },
        ]}
      />
    </Panel>
  );
});

const styles = StyleSheet.create({
  hint: { fontSize: 11, marginTop: -6, marginBottom: 8 },
  chartRow: { flexDirection: 'row', marginTop: 10 },
  readout: { borderWidth: 1, padding: 10 },
  readoutHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  readoutTitle: { fontSize: 13, fontWeight: '700' },
  readoutAction: { fontSize: 12, fontWeight: '700' },
  readoutGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, rowGap: 6 },
  readoutCell: { width: '50%', paddingRight: 8 },
  readoutLabel: { fontSize: 10, fontWeight: '700' },
  hHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  hName: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  hValue: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hTrack: { height: 7 },
  hBar: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3 },
  zeroLine: { position: 'absolute', top: -2, bottom: -2, width: 1 },
  stack: { flexDirection: 'row', height: 9, borderRadius: 4, overflow: 'hidden', marginTop: 5 },
});
