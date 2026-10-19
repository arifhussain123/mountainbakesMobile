import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { FinanceDashboard, FinanceDashboardMetric, FinanceMonthlyDashboard } from '@/api/types';
import { colors as fin } from '@/finance/theme';
import { useAppTheme } from '@/shared/theme';
import { LoadingSkeleton } from '@/shared/ui';
import { formatMoney2, moneyWords } from '../../utils/financeFormat';
import { monthLong, pct, type DrillTarget, type LedgerHeadTotal } from '../../utils/dashboardModel';
import { BAND, BandCard, BarList, Money, Panel, SERIES, Tile, balanceWords } from './parts';

export type Drill = (metric: FinanceDashboardMetric, extra?: Partial<DrillTarget>) => void;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Today strip — company-wide, never filtered
// ---------------------------------------------------------------------------

export function TodayStrip({ cash, loading, onApprovals }: { cash: FinanceDashboard | undefined; loading: boolean; onApprovals: () => void }) {
  const theme = useAppTheme();
  if (loading && !cash) return <LoadingSkeleton height={64} borderRadius={16} />;
  if (!cash) return null;
  const pending = cash.pendingExpenseApprovals;
  return (
    <View style={[st.today, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg, marginBottom: theme.spacing.md }]}>
      <Text style={[st.eyebrow, { color: theme.colors.textFaint }]}>TODAY · COMPANY-WIDE</Text>
      <View style={st.todayRow} accessible accessibilityLabel={`Today, company-wide. Cash in hand ${moneyWords(cash.cashInHand)}. Bank ${moneyWords(cash.bankBalance)}.`}>
        <Text style={[st.todayText, { color: theme.colors.textSecondary }]}>
          Cash in hand <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatMoney2(cash.cashInHand)}</Text>
        </Text>
        <Text style={[st.todayText, { color: theme.colors.textSecondary }]}>
          Bank <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatMoney2(cash.bankBalance)}</Text>
        </Text>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${plural(pending, 'pending approval')}, ${moneyWords(cash.pendingExpenseAmount)}. Opens the Daily Ledger.`}
        onPress={onApprovals}
        hitSlop={6}>
        <Text style={[st.todayLink, { color: pending > 0 ? fin.accent : theme.colors.textSecondary }]}>
          {plural(pending, 'pending approval')} · {formatMoney2(cash.pendingExpenseAmount)} ›
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Summary cards — swipeable, ~88% wide, dots
// ---------------------------------------------------------------------------

interface OverviewItem {
  label: string;
  value: number | null;
  sub: string;
  onPress?: () => void;
  signed?: boolean;
  strong?: boolean;
  /** Drawn below a divider: last month's balance sits beside the month, not inside it. */
  aside?: boolean;
}

export function SummaryCarousel({ data, scoped, drill }: { data: FinanceMonthlyDashboard; scoped: boolean; drill: Drill }) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const s = data.summary;
  const prev = monthLong(data.previousMonth);
  const cardWidth = Math.round((width - theme.spacing.lg * 2) * 0.88);
  const gap = theme.spacing.sm;

  const groups: { title: string; color: string; items: OverviewItem[]; note?: string }[] = [
    {
      title: 'INCOME',
      color: BAND.income,
      items: [
        { label: 'Company Share', value: s.companyShare, sub: plural(s.orders, 'approved demand'), onPress: () => drill('share') },
        { label: 'Received Amount', value: s.received, sub: `${plural(s.receipts, 'ledger receipt')} · incl. fuel`, onPress: () => drill('received') },
        { label: 'Balance', value: s.balance, sub: 'Company Share − Received', signed: true, strong: true },
        {
          label: 'Last Month Balance',
          value: s.lastMonthBalance,
          sub: s.lastMonthBalance === null ? `No records in ${prev}` : `${prev} · Share − Received`,
          signed: true,
          aside: true,
        },
      ],
      note: 'Last month is shown beside, not added.',
    },
    {
      title: 'EXPENSE',
      color: BAND.expense,
      items: [
        {
          label: 'Ledger Expenses',
          value: s.ledgerExpense,
          sub: scoped && !s.ledgerEntries ? 'Company expenses carry no branch' : plural(s.ledgerEntries, 'approved ledger entry', 'approved ledger entries'),
          onPress: s.ledgerEntries ? () => drill('ledger') : undefined,
        },
        { label: 'Return', value: s.returns, sub: plural(s.returnCount, 'accepted production return'), onPress: s.returnCount ? () => drill('return') : undefined },
        { label: 'Discount', value: s.discount, sub: plural(s.discountCount, 'approved production discount'), onPress: s.discountCount ? () => drill('discount') : undefined },
      ],
    },
    {
      title: 'OVERALL · FINANCE LEDGER',
      color: BAND.overall,
      items: [
        { label: 'Total Income', value: s.ledgerIncome, sub: 'All ledger receipts (debits), every head' },
        { label: 'Total Expense', value: s.ledgerExpenseTotal, sub: 'All ledger payments (credits), every head' },
        { label: 'Net', value: s.ledgerNet, sub: 'Total Income − Total Expense', signed: true, strong: true },
      ],
      note: 'The ledger’s own totals, as the Daily Ledger defines them. Production figures (Company Share, Return, Discount) are not combined into one net figure: no business rule relates them.',
    },
  ];

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + gap)));

  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + gap}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={onEnd}
        contentContainerStyle={{ gap, paddingHorizontal: theme.spacing.lg }}
        style={{ marginHorizontal: -theme.spacing.lg }}>
        {groups.map((g) => (
          <View
            key={g.title}
            style={[st.overview, { width: cardWidth, backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg }]}>
            <View style={[st.overviewBand, { backgroundColor: g.color }]}>
              <Text accessibilityRole="header" style={[st.bandTitle, { color: BAND.ink }]}>
                {g.title}
              </Text>
            </View>
            {g.items.map((it, i) => {
              const body = (
                <>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[st.itemLabel, { color: theme.colors.text }]}>{it.label}</Text>
                    <Text style={[st.itemSub, { color: theme.colors.textFaint }]}>{it.sub}</Text>
                  </View>
                  <Money value={it.value} signed={it.signed} style={{ fontSize: it.strong ? 15 : 13, fontWeight: it.strong ? '800' : '700', maxWidth: '55%' }} />
                </>
              );
              const a11y = it.signed ? balanceWords(it.label, it.value) : `${it.label} ${it.value === null ? 'no records' : moneyWords(it.value)}, ${it.sub}`;
              const rowStyle = [
                st.item,
                { borderTopColor: theme.colors.border, borderTopWidth: i ? StyleSheet.hairlineWidth : 0 },
                it.aside && { borderTopWidth: 1, borderStyle: 'dashed' as const, marginTop: 4, opacity: 0.85 },
              ];
              return it.onPress ? (
                <Pressable key={it.label} accessibilityRole="button" accessibilityLabel={a11y} accessibilityHint="Opens the source records" onPress={it.onPress} style={({ pressed }) => [...rowStyle, pressed && { opacity: 0.6 }]}>
                  {body}
                </Pressable>
              ) : (
                <View key={it.label} accessible accessibilityLabel={a11y} style={rowStyle}>
                  {body}
                </View>
              );
            })}
            {g.note ? <Text style={[st.note, { color: theme.colors.textFaint, backgroundColor: theme.colors.background }]}>{g.note}</Text> : null}
          </View>
        ))}
      </ScrollView>
      <View style={st.dots} accessible accessibilityLabel={`Card ${index + 1} of ${groups.length}`}>
        {groups.map((g, i) => (
          <View key={g.title} style={[st.dot, { backgroundColor: i === index ? fin.accent : theme.colors.border, width: i === index ? 16 : 6 }]} />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Income vs Expense — five bars, one scale
// ---------------------------------------------------------------------------

export function IncomeVsExpense({ data, drill }: { data: FinanceMonthlyDashboard; drill: Drill }) {
  const theme = useAppTheme();
  const s = data.summary;
  return (
    <Panel title={`Income vs Expense · ${monthLong(data.month)}`}>
      <BarList
        emptyMessage="No income or expense in this period."
        rows={[
          { key: 'share', label: 'Company Share', caption: 'INCOME', value: s.companyShare, color: SERIES.share, onPress: () => drill('share') },
          { key: 'received', label: 'Received', caption: 'INCOME', value: s.received, color: SERIES.received, onPress: () => drill('received') },
          { key: 'ledger', label: 'Ledger expenses', caption: 'EXPENSE', value: s.ledgerExpense, color: SERIES.ledger, onPress: s.ledgerEntries ? () => drill('ledger') : undefined },
          { key: 'return', label: 'Return', caption: 'EXPENSE', value: s.returns, color: SERIES.returns, onPress: s.returnCount ? () => drill('return') : undefined },
          { key: 'discount', label: 'Discount', caption: 'EXPENSE', value: s.discount, color: SERIES.discount, onPress: s.discountCount ? () => drill('discount') : undefined },
        ]}
      />
      <Text style={[st.foot, { color: theme.colors.textFaint }]}>Each figure is its own bar on one scale; none are added together.</Text>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Balance reconciliation — donut + the subtraction written out
// ---------------------------------------------------------------------------

const DONUT = 104;
const STROKE = 12;

export function Reconciliation({ data }: { data: FinanceMonthlyDashboard }) {
  const theme = useAppTheme();
  const sm = data.summary;
  const rate = sm.companyShare > 0 ? (sm.received / sm.companyShare) * 100 : null;
  const ring = rate === null ? 0 : Math.max(0, Math.min(rate, 100));
  const r = (DONUT - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const line = (label: string, value: number | null, opts: { bold?: boolean; signed?: boolean } = {}) => (
    <View style={[st.recLine, opts.bold && { borderTopWidth: 1.5, borderTopColor: theme.colors.text, paddingTop: 6 }]}>
      <Text style={[st.recLabel, { color: opts.bold ? theme.colors.text : theme.colors.textSecondary, fontWeight: opts.bold ? '700' : '500' }]}>{label}</Text>
      <Money value={value} signed={opts.signed} style={{ fontSize: 13, maxWidth: '58%' }} />
    </View>
  );
  return (
    <Panel title="Balance reconciliation">
      <View style={st.recRow}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={rate === null ? 'No company share this period' : `${rate.toFixed(0)} percent of company share received`}
          style={{ width: DONUT, height: DONUT }}>
          <Svg width={DONUT} height={DONUT}>
            <Circle cx={DONUT / 2} cy={DONUT / 2} r={r} stroke={theme.colors.border} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={DONUT / 2}
              cy={DONUT / 2}
              r={r}
              stroke={SERIES.received}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${(ring / 100) * c} ${c}`}
              strokeLinecap={ring > 0 && ring < 100 ? 'round' : 'butt'}
              transform={`rotate(-90 ${DONUT / 2} ${DONUT / 2})`}
            />
          </Svg>
          <View style={st.donutCenter} pointerEvents="none">
            <Text style={[st.donutPct, { color: theme.colors.text }]}>{rate === null ? '—' : `${rate.toFixed(0)}%`}</Text>
            <Text style={[st.donutCaption, { color: theme.colors.textSecondary }]}>RECEIVED</Text>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }} accessible accessibilityLabel={`${balanceWords('Balance', sm.balance)}, company share minus received.`}>
          {line('Company Share', sm.companyShare)}
          {line('− Received', sm.received)}
          {line('Balance', sm.balance, { bold: true, signed: true })}
        </View>
      </View>
      <View style={[st.recAside, { borderTopColor: theme.colors.border }]} accessible accessibilityLabel={balanceWords(`Last month balance, ${monthLong(data.previousMonth)}`, sm.lastMonthBalance)}>
        <Text style={[st.recLabel, { color: theme.colors.textSecondary, flex: 1 }]}>Last month · {monthLong(data.previousMonth)}</Text>
        <Money value={sm.lastMonthBalance} signed style={{ fontSize: 13, color: theme.colors.textSecondary, maxWidth: '50%' }} />
      </View>
      <Text style={[st.foot, { color: theme.colors.textFaint }]}>Shown side by side, not added: no carry-forward rule is defined for this balance.</Text>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Income KPI tiles (2 columns)
// ---------------------------------------------------------------------------

export function IncomeKpis({ data, context, drill }: { data: FinanceMonthlyDashboard; context: string; drill: Drill }) {
  const sm = data.summary;
  const prev = monthLong(data.previousMonth);
  return (
    <BandCard title="INCOME" color={BAND.income} right={context}>
      <View style={st.grid2}>
        <View style={st.cell2}>
          <Tile label="Demand amount" value={sm.demand} sub={plural(sm.orders, 'production-reviewed order')} color={SERIES.demand} onPress={sm.orders ? () => drill('demand') : undefined} />
        </View>
        <View style={st.cell2}>
          <Tile label="Company Share" value={sm.companyShare} sub={`${pct(sm.companyShare, sm.demand)} of demand`} color={SERIES.share} onPress={sm.orders ? () => drill('share') : undefined} />
        </View>
        <View style={st.cell2}>
          <Tile label="Received" value={sm.received} sub={`${pct(sm.received, sm.companyShare)} of share`} color={SERIES.received} onPress={sm.receipts ? () => drill('received') : undefined} />
        </View>
        <View style={st.cell2}>
          <Tile
            label="Balance"
            value={sm.balance}
            sub="Company Share − Received"
            color={BAND.overall}
            signed
            accessibilityLabel={`${balanceWords('Balance', sm.balance)}, company share minus received`}
          />
        </View>
        <View style={st.cell2}>
          <Tile
            label="Last month balance"
            value={sm.lastMonthBalance}
            sub={sm.lastMonthBalance === null ? `No records in ${prev}` : prev}
            color={SERIES.demand}
            signed
            accessibilityLabel={balanceWords(`Last month balance, ${prev}`, sm.lastMonthBalance)}
          />
        </View>
      </View>
    </BandCard>
  );
}

// ---------------------------------------------------------------------------
// Expenses KPI tiles + ledger head breakdown
// ---------------------------------------------------------------------------

const TOP_HEADS = 6;

export function ExpenseKpis({
  data,
  heads,
  context,
  scoped,
  drill,
}: {
  data: FinanceMonthlyDashboard;
  heads: LedgerHeadTotal[];
  context: string;
  scoped: boolean;
  drill: Drill;
}) {
  const theme = useAppTheme();
  const [showAll, setShowAll] = useState(false);
  const sm = data.summary;
  const shown = showAll ? heads : heads.slice(0, TOP_HEADS);
  return (
    <>
      <BandCard title="EXPENSES" color={BAND.expense} right={context}>
        <View style={st.grid3}>
          <Tile
            compactText
            label="Ledger head"
            value={sm.ledgerExpense}
            sub={`${plural(heads.length, 'head')} · ${plural(sm.ledgerEntries, 'entry', 'entries')}`}
            color={SERIES.ledger}
            onPress={sm.ledgerEntries ? () => drill('ledger') : undefined}
          />
          <Tile compactText label="Return" value={sm.returns} sub={`${pct(sm.returns, sm.demand)} of demand`} color={SERIES.returns} onPress={sm.returnCount ? () => drill('return') : undefined} />
          <Tile compactText label="Discount" value={sm.discount} sub={`${pct(sm.discount, sm.demand)} of demand`} color={SERIES.discount} onPress={sm.discountCount ? () => drill('discount') : undefined} />
        </View>
      </BandCard>
      <Panel title="Ledger head breakdown">
        <BarList
          emptyMessage={scoped ? 'No ledger expense is recorded against this branch — company expenses carry no branch.' : 'No ledger expense in this period.'}
          rows={shown.map((h) => ({
            key: h.ledgerHeadId,
            label: h.name,
            caption: `${plural(h.entries, 'ENTRY', 'ENTRIES')} · ${pct(h.amount, sm.ledgerExpense)}`,
            captionBelow: true,
            value: h.amount,
            color: SERIES.ledger,
            onPress: () => drill('ledger', { ledgerHeadId: h.ledgerHeadId, context: `${context} · ${h.name}` }),
          }))}
        />
        {heads.length > TOP_HEADS ? (
          <Pressable accessibilityRole="button" onPress={() => setShowAll((v) => !v)} hitSlop={6} style={{ marginTop: theme.spacing.md }}>
            <Text style={[st.more, { color: fin.accent }]}>{showAll ? 'Show top 6' : `Show all ${heads.length} heads`}</Text>
          </Pressable>
        ) : null}
      </Panel>
    </>
  );
}

const st = StyleSheet.create({
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  today: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  todayRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 2 },
  todayText: { fontSize: 13 },
  todayLink: { fontSize: 12, fontWeight: '700' },
  overview: { borderWidth: 1, overflow: 'hidden' },
  overviewBand: { paddingHorizontal: 14, paddingVertical: 9 },
  bandTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  itemLabel: { fontSize: 13, fontWeight: '700' },
  itemSub: { fontSize: 11, marginTop: 1 },
  note: { fontSize: 11, lineHeight: 15, paddingHorizontal: 14, paddingVertical: 10, marginTop: 'auto' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { height: 6, borderRadius: 3 },
  foot: { fontSize: 11, marginTop: 12 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutPct: { fontSize: 20, fontWeight: '800' },
  donutCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  recLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  recLabel: { fontSize: 12 },
  recAside: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, rowGap: 10 },
  cell2: { width: '50%', paddingHorizontal: 5 },
  grid3: { flexDirection: 'row', gap: 8 },
  more: { fontSize: 13, fontWeight: '700' },
});
