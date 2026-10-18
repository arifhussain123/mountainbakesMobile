import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SectionList, Share, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  FINANCE_REPORT_LABELS,
  FINANCE_REPORT_TYPES,
  getBusinessDate,
  useFinanceReport,
  useLedgerHeads,
  type FinanceReport,
  type FinanceReportType,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, DateRangeSheet, EmptyState, ErrorState, FilterChipRow, FormBottomSheet, Icon, LoadingSkeleton, Screen, StatCard } from '@/shared/ui';
import { formatDisplayDate, type DateRange } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { computeCashBookBalances, groupByDate, type CashBookRowOut } from '../../utils/cashBookBalance';
import { approverLabel, formatMoney2, formatStamp } from '../../utils/financeFormat';
import { reportToCsv } from '../../utils/reportCsv';
import { styles } from './styles';

type Row = FinanceReport['rows'][number];
type BalancedRow = CashBookRowOut<Row>;

/** Reports that take a ledger-head filter on the server. */
const HEAD_FILTERED: readonly FinanceReportType[] = ['daily_cash_book', 'general_ledger'];

const num = (v: Row[string] | undefined): number | null => (typeof v === 'number' ? v : null);

function formatCell(value: string | number | null | undefined, format: string | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'money' && typeof value === 'number') return formatMoney2(value);
  if (format === 'date' && typeof value === 'string') return formatDisplayDate(value);
  return String(value);
}

function defaultRange(type: FinanceReportType, today: string): DateRange {
  // The server's own defaults: a cash book is one day, everything else a month.
  return type === 'daily_cash_book' ? { from: today, to: today } : { from: `${today.slice(0, 8)}01`, to: today };
}

/**
 * mountainbakesFinance.html screen 19 — Finance Reports.
 *
 * The Daily Cash Book is not shown as the server sends it: its Balance column
 * is the posting-order balance (cashBookBalance.ts), so rows are grouped by
 * date and re-balanced in the order they are shown, with a marker on every row
 * whose stored figure differs. Other reports are the server's descriptor as
 * cards, one per row, so nothing scrolls sideways at 360dp.
 *
 * Export is CSV through the share sheet, built from the rows on screen. PDF and
 * Excel need a file library this app does not have yet.
 */
export function FinanceReportsScreen() {
  const theme = useAppTheme();
  const today = getBusinessDate();
  const [type, setType] = useState<FinanceReportType>('daily_cash_book');
  const [range, setRange] = useState<DateRange>(() => defaultRange('daily_cash_book', today));
  const [headId, setHeadId] = useState<string>('all');
  const pickerRef = useRef<BottomSheetModal>(null);
  const rangeRef = useRef<BottomSheetModal>(null);

  const usesHead = HEAD_FILTERED.includes(type);
  const heads = useLedgerHeads();
  const { data, isLoading, error, refetch, isRefetching } = useFinanceReport({
    type,
    from: range.from,
    to: range.to,
    ...(usesHead && headId !== 'all' ? { ledgerHeadId: headId } : {}),
  });

  const isCashBook = data?.type === 'daily_cash_book';
  const filtered = usesHead && headId !== 'all';
  const summaryValue = (label: string) => data?.summary.find((s) => s.label === label)?.value ?? 0;
  const opening = summaryValue('Opening Balance');

  const balanced = useMemo<BalancedRow[]>(() => {
    if (!data) return [];
    if (!isCashBook) return data.rows.map((row) => ({ row, runningBalance: null, postingOrderDiffers: false }));
    const out = computeCashBookBalances(
      opening,
      data.rows.map((r) => ({ debit: num(r.debit), credit: num(r.credit), balance: num(r.balance) })),
      { filtered },
    );
    return out.map((o, i) => ({ ...o, row: data.rows[i]! }));
  }, [data, isCashBook, opening, filtered]);

  const sections = useMemo(
    () => (isCashBook ? groupByDate(balanced).map((g) => ({ title: g.date, data: g.rows })) : [{ title: '', data: balanced }]),
    [balanced, isCashBook],
  );
  const reordered = balanced.filter((r) => r.postingOrderDiffers).length;

  const pickType = (t: FinanceReportType) => {
    setType(t);
    setRange(defaultRange(t, today));
    setHeadId('all');
    pickerRef.current?.dismiss();
  };

  const exportCsv = async () => {
    if (!data) return;
    try {
      const csv = reportToCsv(data, isCashBook ? balanced.map((r) => r.runningBalance) : undefined);
      await Share.share({ title: `${data.title} ${range.from} to ${range.to}`, message: csv });
    } catch (e) {
      Alert.alert('Export Failed', mapErrorToMessage(e));
    }
  };

  const formula = isCashBook
    ? `Opening ${formatMoney2(opening)} + receipts ${formatMoney2(summaryValue('Total Receipts'))} − payments ${formatMoney2(summaryValue('Total Payments'))} = closing ${formatMoney2(summaryValue('Closing Balance'))}`
    : null;

  const header = (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Report: ${FINANCE_REPORT_LABELS[type]}. Change report.`}
        onPress={() => pickerRef.current?.present()}
        style={[styles.pickerButton, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>REPORT</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{FINANCE_REPORT_LABELS[type]}</Text>
        </View>
        <Icon name="chevron-down" size={18} color={theme.colors.text} />
      </Pressable>

      <View style={[styles.filterRow, { marginTop: theme.spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Period ${range.from} to ${range.to}. Change dates.`}
          onPress={() => rangeRef.current?.present()}
          style={[styles.rangeButton, { borderColor: theme.colors.border, borderRadius: theme.radii.pill }]}>
          <Icon name="calendar" size={14} color={theme.colors.text} />
          <Text style={[theme.typography.label, { color: theme.colors.text }]}>
            {range.from === range.to ? formatDisplayDate(range.from) : `${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)}`}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export as CSV"
          accessibilityState={{ disabled: !data }}
          disabled={!data}
          onPress={() => void exportCsv()}
          style={[styles.rangeButton, { borderColor: theme.colors.border, borderRadius: theme.radii.pill, opacity: data ? 1 : 0.4 }]}>
          <Icon name="file-spreadsheet" size={14} color={theme.colors.text} />
          <Text style={[theme.typography.label, { color: theme.colors.text }]}>Export CSV</Text>
        </Pressable>
      </View>

      {usesHead ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <FilterChipRow
            options={[{ value: 'all', label: 'All ledger heads' }, ...(heads.data ?? []).filter((h) => h.isActive).map((h) => ({ value: h.id, label: h.name }))]}
            value={headId}
            onChange={setHeadId}
          />
        </View>
      ) : null}

      {isLoading ? <LoadingSkeleton height={140} /> : null}
      {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

      {data ? (
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>{data.title}</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {data.periodFrom === data.periodTo ? formatDisplayDate(data.periodFrom) : `${formatDisplayDate(data.periodFrom)} to ${formatDisplayDate(data.periodTo)}`}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            Generated {formatStamp(data.generatedAt)} by {data.generatedBy}
          </Text>
          {data.summary.length > 0 ? (
            <View style={[styles.summaryGrid, { marginTop: theme.spacing.md }]}>
              {data.summary.map((s) => (
                <View key={s.label} style={styles.summaryCell}>
                  <StatCard label={s.label} value={formatCell(s.value, s.format)} />
                </View>
              ))}
            </View>
          ) : null}
          {formula ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>{formula}</Text> : null}
          {isCashBook && filtered ? (
            <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: theme.spacing.sm }]}>
              Running balance hidden: with one ledger head selected, other vouchers also moved the balance.
            </Text>
          ) : null}
          {isCashBook && reordered > 0 ? (
            <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: theme.spacing.sm }]}>
              {reordered} {reordered === 1 ? 'voucher was' : 'vouchers were'} posted out of date order. Balances here are recomputed in the order shown; the
              server's stored balance is noted on each one.
            </Text>
          ) : null}
        </Card>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <AppHeader title="Finance Reports" subtitle="Pick a report, a period and a filter" actions={[]} />
      <SectionList
        sections={data ? sections : []}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs }]}>
              {formatDisplayDate(section.title).toUpperCase()}
            </Text>
          ) : null
        }
        ListEmptyComponent={!isLoading && !error && data ? <EmptyState title="No Rows" message="Nothing matched this report's filters." /> : undefined}
        renderItem={({ item }) =>
          isCashBook ? (
            <CashBookRow item={item} />
          ) : (
            <Card style={{ marginTop: theme.spacing.sm }}>
              {data?.columns.map((col) => (
                <View key={col.key} style={styles.kv}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{col.label}</Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' }]}>
                    {formatCell(item.row[col.key], col.format)}
                  </Text>
                </View>
              ))}
            </Card>
          )
        }
        ListFooterComponent={
          data && data.rows.length > 0 && Object.keys(data.totals).length > 0 ? (
            <Card style={{ marginTop: theme.spacing.md }}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Totals</Text>
              {data.columns
                .filter((c) => c.key in data.totals)
                .map((c) => (
                  <View key={c.key} style={styles.kv}>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{c.label}</Text>
                    <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCell(data.totals[c.key], c.format)}</Text>
                  </View>
                ))}
            </Card>
          ) : undefined
        }
      />

      <FormBottomSheet ref={pickerRef} title="Choose a report" onRequestClose={() => pickerRef.current?.dismiss()} snapPoints={['70%']}>
        {FINANCE_REPORT_TYPES.map((t) => (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityState={{ selected: t === type }}
            onPress={() => pickType(t)}
            style={[styles.pickerRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={[theme.typography.body, { color: t === type ? theme.colors.primary : theme.colors.text, fontWeight: t === type ? '700' : '400' }]}>
              {FINANCE_REPORT_LABELS[t]}
            </Text>
            {t === type ? <Icon name="check" size={16} color={theme.colors.primary} /> : null}
          </Pressable>
        ))}
      </FormBottomSheet>

      <DateRangeSheet ref={rangeRef} today={today} value={range} onApply={setRange} onRequestClose={() => rangeRef.current?.dismiss()} />
    </Screen>
  );
}

function CashBookRow({ item }: { item: BalancedRow }) {
  const theme = useAppTheme();
  const r = item.row;
  const debit = num(r.debit);
  const credit = num(r.credit);
  const approvedBy = typeof r.approvedByName === 'string' && r.approvedByName !== '—' ? r.approvedByName : null;
  return (
    <Card style={{ marginTop: theme.spacing.sm }}>
      <View style={styles.kv}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{String(r.voucherNo ?? '—')}</Text>
        <Text style={[theme.typography.body, { color: debit ? theme.colors.success : theme.colors.danger, fontWeight: '700' }]}>
          {debit ? `+${formatMoney2(debit)}` : `−${formatMoney2(credit ?? 0)}`}
        </Text>
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 2 }]}>
        {String(r.ledgerHeadName ?? '')} · {String(r.description ?? '')}
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
        {String(r.branchName ?? '—')} · Approved by {approverLabel(approvedBy)}
      </Text>
      {item.runningBalance !== null ? (
        <View style={[styles.kv, { marginTop: theme.spacing.xs }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Balance</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{formatMoney2(item.runningBalance)}</Text>
        </View>
      ) : null}
      {item.postingOrderDiffers ? (
        <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 2 }]}>
          Posted out of date order. Stored balance {formatMoney2(num(r.balance))}.
        </Text>
      ) : null}
    </Card>
  );
}
