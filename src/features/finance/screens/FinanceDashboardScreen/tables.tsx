import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { FinanceMonthlyDashboard } from '@/api/types';
import { colors as fin } from '@/finance/theme';
import { useDebouncedValue } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { SearchBar } from '@/shared/ui';
import { formatMoney2, moneyWords } from '../../utils/financeFormat';
import {
  PRODUCTION_HEAD_FILTER,
  PRODUCTION_ROW_LABEL,
  balanceMeaning,
  bucketRange,
  expenseRows,
  expenseTotals,
  incomeRows,
  incomeTotals,
  isIdleIncomeRow,
  searchExpense,
  searchIncome,
  sortExpense,
  sortIncome,
  type ExpenseRow,
  type Granularity,
  type IncomeRow,
  type LedgerHeadTotal,
} from '../../utils/dashboardModel';
import { BAND, BandCard, Money, Segmented, balanceWords } from './parts';
import type { Drill } from './sections';

/**
 * The web's Income and Expenses tables as cards — one card per branch and
 * period. Rows render a page at a time ("Show more") so a daily view of a busy
 * month never mounts hundreds of cards at once; the totals card always sums
 * every matching row, not just the visible ones, as the web's TOTAL row does.
 */

const GRANS: { value: Granularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
/** The web's page sizes, per granularity. */
const PAGE: Record<Granularity, number> = { daily: 15, weekly: 20, monthly: 25 };

function Field({ label, value, signed, muted, words }: { label: string; value: number | null; signed?: boolean; muted?: boolean; words?: string }) {
  const theme = useAppTheme();
  const meaning = signed ? balanceMeaning(value) : null;
  return (
    <View style={styles.field} accessible accessibilityLabel={words ?? `${label} ${value === null ? 'none' : moneyWords(value)}`}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textFaint }]}>{label}</Text>
      <Money value={value} signed={signed} nullLabel="—" style={[{ fontSize: 13 }, muted && { color: theme.colors.textSecondary, fontWeight: '600' }]} />
      {meaning === 'overpaid' ? <Text style={[styles.flag, { color: theme.colors.danger }]}>overpaid</Text> : null}
    </View>
  );
}

function ShowMore({ shown, total, onPress }: { shown: number; total: number; onPress: () => void }) {
  if (shown >= total) return null;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6} style={styles.more}>
      <Text style={[styles.moreText, { color: fin.accent }]}>
        Show more · {shown} of {total}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Income
// ---------------------------------------------------------------------------

export function IncomeTable({ data, gran, onGran, drill }: { data: FinanceMonthlyDashboard; gran: Granularity; onGran: (g: Granularity) => void; drill: Drill }) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 250);
  const [limit, setLimit] = useState(PAGE[gran]);
  const [showIdle, setShowIdle] = useState(false);
  const all = useMemo(() => sortIncome(incomeRows(data, gran)), [data, gran]);
  const rows = useMemo(() => searchIncome(all, q), [all, q]);
  const active = rows.filter((r) => !isIdleIncomeRow(r));
  const idle = rows.filter(isIdleIncomeRow);
  const totals = incomeTotals(rows, gran);
  const firstCol = gran === 'monthly' ? 'Month' : gran === 'weekly' ? 'Week' : 'Date';

  const open = (metric: 'demand' | 'share' | 'received', r: IncomeRow) => {
    const range = bucketRange(gran, r.bucket, data.from, data.to);
    drill(metric, { ...range, branchId: r.branchId, context: `${r.period} · ${r.branch}` });
  };

  const card = (r: IncomeRow, muted = false) => (
    <View key={r.id} style={[styles.card, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.background, borderRadius: theme.radii.md, opacity: muted ? 0.8 : 1 }]}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.colors.text }]}>
            {r.branch}
          </Text>
          <Text style={[styles.cardSub, { color: theme.colors.textFaint }]}>
            {firstCol} · {r.period}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', maxWidth: '50%' }} accessible accessibilityLabel={balanceWords('Balance', r.balance)}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textFaint }]}>BALANCE</Text>
          <Money value={r.balance} signed style={{ fontSize: 14 }} />
          {r.balance < 0 ? <Text style={[styles.flag, { color: theme.colors.danger }]}>overpaid</Text> : null}
        </View>
      </View>
      <View style={styles.fields}>
        <Pressable disabled={!r.orders} onPress={() => open('demand', r)} style={styles.fieldWrap} accessibilityRole={r.orders ? 'button' : undefined}>
          <Field label="DEMAND" value={r.demand} />
        </Pressable>
        <Pressable disabled={!r.orders} onPress={() => open('share', r)} style={styles.fieldWrap} accessibilityRole={r.orders ? 'button' : undefined}>
          <Field label="COMPANY SHARE" value={r.companyShare} />
        </Pressable>
        <Pressable disabled={!r.receipts} onPress={() => open('received', r)} style={styles.fieldWrap} accessibilityRole={r.receipts ? 'button' : undefined}>
          <Field label="RECEIVED" value={r.received} />
        </Pressable>
        <View style={styles.fieldWrap}>
          <Field label="LAST MONTH" value={r.lastMonthBalance} signed muted words={gran === 'monthly' ? balanceWords('Last month balance', r.lastMonthBalance) : 'Last month balance, monthly view only'} />
        </View>
      </View>
    </View>
  );

  return (
    <BandCard title="INCOME" color={BAND.income}>
      <View style={{ gap: theme.spacing.sm }}>
        <Segmented
          options={GRANS}
          value={gran}
          onChange={(g) => {
            onGran(g);
            setLimit(PAGE[g]);
          }}
        />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search branch or date" />
      </View>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        {active.length === 0 && idle.length === 0 ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{q ? 'No rows match this search.' : 'No income in this period.'}</Text>
        ) : null}
        {active.slice(0, limit).map((r) => card(r))}
        <ShowMore shown={Math.min(limit, active.length)} total={active.length} onPress={() => setLimit((l) => l + PAGE[gran])} />
        {idle.length > 0 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showIdle }}
              onPress={() => setShowIdle((v) => !v)}
              style={[styles.idle, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.md }]}>
              <Text style={[styles.idleText, { color: theme.colors.textSecondary }]}>
                {idle.length} {idle.length === 1 ? 'branch' : 'branches'} with no activity · last month's balance only
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>{showIdle ? '▴' : '▾'}</Text>
            </Pressable>
            {showIdle ? idle.map((r) => card(r, true)) : null}
          </>
        ) : null}
        {rows.length > 0 ? (
          <View style={[styles.total, { backgroundColor: BAND.income, borderRadius: theme.radii.md }]}>
            <Text style={[styles.totalTitle, { color: BAND.ink }]}>{q ? 'TOTAL (search)' : 'TOTAL'}</Text>
            <View style={styles.fields}>
              {(
                [
                  ['Demand', totals.demand],
                  ['Company Share', totals.companyShare],
                  ['Received', totals.received],
                  ['Balance', totals.balance],
                  ['Last month', totals.lastMonthBalance],
                ] as const
              ).map(([label, v]) => (
                <View
                  key={label}
                  style={styles.fieldWrap}
                  accessible
                  accessibilityLabel={label === 'Balance' || label === 'Last month' ? balanceWords(`Total ${label.toLowerCase()}`, v) : `Total ${label} ${v === null ? 'none' : moneyWords(v)}`}>
                  <Text style={[styles.fieldLabel, { color: BAND.inkMuted }]}>{label.toUpperCase()}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.totalValue, { color: BAND.ink }]}>
                    {v === null ? '—' : formatMoney2(v)}
                    {label === 'Balance' && v !== null && v < 0 ? ' overpaid' : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </BandCard>
  );
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export function ExpenseTable({
  data,
  heads,
  gran,
  onGran,
  drill,
}: {
  data: FinanceMonthlyDashboard;
  heads: LedgerHeadTotal[];
  gran: Granularity;
  onGran: (g: Granularity) => void;
  drill: Drill;
}) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 250);
  const [head, setHead] = useState('');
  const [limit, setLimit] = useState(PAGE[gran]);
  const all = useMemo(() => sortExpense(expenseRows(data, gran)), [data, gran]);
  const rows = useMemo(() => searchExpense(all, q, head), [all, q, head]);
  const totals = expenseTotals(rows);
  const hasProduction = all.some((r) => r.kind === 'production');
  const headOptions = [
    { value: '', label: 'All ledger heads' },
    ...(hasProduction ? [{ value: PRODUCTION_HEAD_FILTER, label: PRODUCTION_ROW_LABEL }] : []),
    ...[...heads].sort((a, b) => a.name.localeCompare(b.name)).map((h) => ({ value: h.ledgerHeadId, label: h.name })),
  ];
  const firstCol = gran === 'monthly' ? 'Month' : gran === 'weekly' ? 'Week' : 'Date';

  const open = (r: ExpenseRow, metric: 'ledger' | 'return' | 'discount') => {
    const range = bucketRange(gran, r.bucket, data.from, data.to);
    drill(metric, { ...range, branchId: r.branchId, ledgerHeadId: metric === 'ledger' ? r.ledgerHeadId ?? undefined : undefined, context: `${r.period} · ${r.branch}` });
  };

  return (
    <BandCard title="EXPENSES" color={BAND.expense}>
      <View style={{ gap: theme.spacing.sm }}>
        <Segmented
          options={GRANS}
          value={gran}
          onChange={(g) => {
            onGran(g);
            setLimit(PAGE[g]);
          }}
        />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search branch or head" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {headOptions.map((o) => {
            const on = o.value === head;
            return (
              <Pressable
                key={o.value || 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setHead(o.value)}
                style={[styles.chip, { borderColor: on ? fin.accent : theme.colors.cardBorder, backgroundColor: on ? `${fin.accent}22` : 'transparent', borderRadius: theme.radii.pill }]}>
                <Text style={[styles.chipText, { color: on ? fin.accent : theme.colors.textSecondary }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        {rows.length === 0 ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{q || head ? 'No rows match these filters.' : 'No expense in this period.'}</Text>
        ) : null}
        {rows.slice(0, limit).map((r) => (
          <View key={r.id} style={[styles.card, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.background, borderRadius: theme.radii.md }]}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.colors.text }]}>
                  {r.branch}
                </Text>
                <Text numberOfLines={2} style={[styles.cardSub, { color: r.kind === 'production' ? theme.colors.textSecondary : theme.colors.text }]}>
                  {r.ledgerHead}
                </Text>
                <Text style={[styles.cardSub, { color: theme.colors.textFaint }]}>
                  {firstCol} · {r.period} · {r.entries} {r.entries === 1 ? 'entry' : 'entries'}
                </Text>
              </View>
              {r.kind === 'ledger' ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Amount ${moneyWords(r.amount ?? 0)}. Opens the vouchers.`} onPress={() => open(r, 'ledger')} style={{ alignItems: 'flex-end', maxWidth: '50%' }}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textFaint }]}>AMOUNT</Text>
                  <Money value={r.amount} style={{ fontSize: 14 }} />
                </Pressable>
              ) : null}
            </View>
            {r.kind === 'production' ? (
              <View style={styles.fields}>
                <Pressable disabled={!r.returns} onPress={() => open(r, 'return')} style={styles.fieldWrap} accessibilityRole={r.returns ? 'button' : undefined}>
                  <Field label="RETURN" value={r.returns} muted />
                </Pressable>
                <Pressable disabled={!r.discount} onPress={() => open(r, 'discount')} style={styles.fieldWrap} accessibilityRole={r.discount ? 'button' : undefined}>
                  <Field label="DISCOUNT" value={r.discount} muted />
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        <ShowMore shown={Math.min(limit, rows.length)} total={rows.length} onPress={() => setLimit((l) => l + PAGE[gran])} />
        {rows.length > 0 ? (
          <View style={[styles.total, { backgroundColor: BAND.expense, borderRadius: theme.radii.md }]}>
            <Text style={[styles.totalTitle, { color: BAND.ink }]}>{q || head ? 'TOTAL (filtered)' : 'TOTAL'}</Text>
            <View style={styles.fields}>
              {(
                [
                  ['Amount', totals.amount],
                  ['Return', totals.returns],
                  ['Discount', totals.discount],
                ] as const
              ).map(([label, v]) => (
                <View key={label} style={styles.fieldWrap} accessible accessibilityLabel={`Total ${label} ${moneyWords(v)}`}>
                  <Text style={[styles.fieldLabel, { color: '#E8D6C6' }]}>{label.toUpperCase()}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.totalValue, { color: BAND.ink }]}>
                    {formatMoney2(v)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </BandCard>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 12 },
  cardHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { fontSize: 13, fontWeight: '700' },
  cardSub: { fontSize: 11, marginTop: 2 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, rowGap: 8 },
  fieldWrap: { width: '50%', paddingRight: 8 },
  field: {},
  fieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  flag: { fontSize: 10, fontWeight: '700' },
  more: { alignItems: 'center', paddingVertical: 8 },
  moreText: { fontSize: 13, fontWeight: '700' },
  idle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderStyle: 'dashed', padding: 12 },
  idleText: { fontSize: 12, fontWeight: '600', flex: 1 },
  total: { padding: 12 },
  totalTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  totalValue: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chip: { height: 32, paddingHorizontal: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '700' },
});
