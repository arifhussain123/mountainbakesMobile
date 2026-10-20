import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  useFinanceCashTransfers,
  useLedgerSummary,
  usePendingApprovals,
  type CashTransfer,
  type FinancePendingApprovalKind,
  type LedgerPage,
} from '@/api';
import { formatMoney2 } from '@/features/finance/utils/financeFormat';
import { useAppTheme } from '@/shared/theme';
import { Card, LoadingSkeleton, SecondaryButton, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { ActionChip, SummaryTiles } from '../../components';
import { channelsLabel, LEDGER_STATUS_LABELS, PENDING_APPROVAL_LABELS, shortBranch, type DisplayEntry } from './ledgerDisplay';

/** Web `PendingCashTransfersPanel`'s PANEL_LIMIT. */
const PANEL_LIMIT = 10;

const STATUS_VARIANT: Record<DisplayEntry['status'], StatusVariant> = {
  posted: 'success',
  locked: 'neutral',
  reversed: 'danger',
};

/** The amber "waiting to enter the book" box both pending panels share. */
function AmberPanel({
  title,
  count,
  right,
  link,
  children,
}: {
  title: string;
  count: number;
  right?: string;
  link?: { label: string; onPress: () => void };
  children: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.panel,
        { borderColor: `${theme.colors.warning}55`, backgroundColor: `${theme.colors.warning}12`, borderRadius: theme.radii.md },
      ]}>
      <View style={styles.panelHead}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flexShrink: 1 }]}>{title}</Text>
        <StatusBadge label={String(count)} variant="warning" />
        {right ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', marginLeft: 'auto' }]}>{right}</Text>
        ) : null}
        {link ? <TextLink label={link.label} onPress={link.onPress} style={right ? undefined : styles.pushRight} /> : null}
      </View>
      {children}
    </View>
  );
}

/** The web's small primary-coloured link ("Open Cash Transfers", "Review"). */
function TextLink({ label, onPress, style }: { label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="link" accessibilityLabel={label} style={style}>
      <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

function PanelRow({ refNo, children, last }: { refNo: string; children: ReactNode; last: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.panelRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${theme.colors.warning}40` }]}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontFamily: 'monospace' }]}>{refNo}</Text>
      {children}
    </View>
  );
}

/**
 * Web "Cash transfers awaiting approval" — the oldest pending branch
 * handovers, not yet in the book, with the web's Approve / Reject on each row
 * when `canDecide` (the Finance Settings toggle lets Super Admin modify), and
 * the web's "Open Cash Transfers" link to the full queue.
 * Renders nothing while loading or when the queue is empty, like the web.
 */
export function PendingCashTransfersPanel({
  canDecide,
  onApprove,
  onReject,
  onOpenCashTransfers,
}: {
  canDecide: boolean;
  onApprove: (t: CashTransfer) => void;
  onReject: (t: CashTransfer) => void;
  onOpenCashTransfers: () => void;
}) {
  const theme = useAppTheme();
  const { data, isLoading } = useFinanceCashTransfers({ status: 'pending', limit: PANEL_LIMIT, sortBy: 'createdAt', sortDir: 'asc' });
  const rows = data?.transfers ?? [];
  const total = data?.total ?? 0;
  if (isLoading || rows.length === 0) return null;

  return (
    <AmberPanel title="Cash transfers awaiting approval" count={total} link={{ label: 'Open Cash Transfers', onPress: onOpenCashTransfers }}>
      {rows.map((t, i) => (
        <PanelRow key={t.id} refNo={t.transferNo} last={i === rows.length - 1}>
          <View style={styles.rowLine}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{shortBranch(t.branchName)}</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{formatMoney2(t.amount)}</Text>
            {t.fuelCharges > 0 ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>+ Fuel {formatMoney2(t.fuelCharges)}</Text>
            ) : null}
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {channelsLabel(t)} · {formatDisplayDate(t.date)}
          </Text>
          {canDecide ? (
            <View style={styles.actions}>
              <ActionChip icon="check" label="Approve" primary onPress={() => onApprove(t)} />
              <ActionChip icon="close" label="Reject" danger onPress={() => onReject(t)} />
            </View>
          ) : null}
        </PanelRow>
      ))}
      {total > rows.length ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          Showing the oldest {rows.length} of {total}.
        </Text>
      ) : null}
    </AmberPanel>
  );
}

/**
 * Web "Pending approval — not in the ledger yet" — income/expense, partner,
 * salary and advance documents awaiting a decision, whatever their date.
 * Each row's "Review" opens the screen that decides that kind, like the web.
 */
export function PendingApprovalsPanel({ onReview }: { onReview: (kind: FinancePendingApprovalKind) => void }) {
  const theme = useAppTheme();
  const { data: items = [], isLoading } = usePendingApprovals();
  if (isLoading || items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.amount, 0);

  return (
    <AmberPanel title="Pending approval — not in the ledger yet" count={items.length} right={formatMoney2(total)}>
      {items.map((item, i) => (
        <PanelRow key={`${item.kind}:${item.id}`} refNo={item.refNo} last={i === items.length - 1}>
          <View style={styles.rowLine}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{PENDING_APPROVAL_LABELS[item.kind]}</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{formatMoney2(item.amount)}</Text>
            <TextLink label="Review" onPress={() => onReview(item.kind)} style={styles.pushRight} />
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {[item.description, item.date ? formatDisplayDate(item.date) : '—'].filter(Boolean).join(' · ')}
            {item.status === 'draft' ? ' · draft' : ''}
          </Text>
        </PanelRow>
      ))}
    </AmberPanel>
  );
}

/**
 * Web `LedgerSummaryCards` — month-to-date as of the range's end date, scoped
 * only by branch; the list's other filters never move these four numbers.
 */
export function LedgerSummaryTiles({ date, branchId }: { date: string; branchId?: string }) {
  const theme = useAppTheme();
  const { data, isLoading, error, refetch } = useLedgerSummary({ to: date, branchId });
  if (isLoading) return <LoadingSkeleton height={150} />;
  if (error) {
    return (
      <Card style={styles.errorCard}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text, textAlign: 'center' }]}>Could not load the ledger summary</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center' }]}>{mapErrorToMessage(error)}</Text>
        <SecondaryButton label="Retry" onPress={() => void refetch()} />
      </Card>
    );
  }
  return (
    <SummaryTiles
      tiles={[
        { label: 'Opening Balance', value: formatMoney2(data?.openingBalance) },
        { label: 'Total Amount Received', value: formatMoney2(data?.totalReceived), tone: 'success' },
        { label: 'Total Amount Expense', value: formatMoney2(data?.totalExpense), tone: 'danger' },
        { label: 'Balance', value: formatMoney2(data?.balance) },
      ]}
    />
  );
}

/** Web `ReadOnlyNotice`, worded for the one role that reaches this screen — shown while the toggle keeps Super Admin out. */
export function ReadOnlyBanner() {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.banner,
        { borderColor: `${theme.colors.warning}55`, backgroundColor: `${theme.colors.warning}14`, borderRadius: theme.radii.md },
      ]}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
        You are signed in as <Text style={{ fontWeight: '700' }}>Super Admin</Text> — this module is read-only for your role.
      </Text>
    </View>
  );
}

/** "Opening balance brought forward" — the row above the first voucher. */
export function OpeningBalanceRow({ value }: { value: number | undefined }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', flexShrink: 1 }]}>
        Opening balance brought forward
      </Text>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatMoney2(value)}</Text>
    </View>
  );
}

/** Totals over the WHOLE filtered set (server-side), not the rows loaded so far. */
export function LedgerTotals({ page }: { page: LedgerPage | undefined }) {
  const theme = useAppTheme();
  const total = page?.total ?? 0;
  const line = (label: string, value: number | undefined, color: string, bold?: boolean) => (
    <View style={styles.totalLine}>
      <Text style={[theme.typography.bodySmall, { color: bold ? theme.colors.text : theme.colors.textSecondary, fontWeight: bold ? '700' : '500' }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color, fontWeight: '700' }]}>{formatMoney2(value)}</Text>
    </View>
  );
  return (
    <View style={[styles.totals, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase' }]}>
        Totals · {total} {total === 1 ? 'voucher' : 'vouchers'} matching the filters
      </Text>
      {line('Total debit', page?.totalDebit, theme.colors.success)}
      {line('Total credit', page?.totalCredit, theme.colors.danger)}
      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, paddingTop: 6 }}>
        {line('Closing balance', page?.closingBalance, theme.colors.text, true)}
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textAlign: 'right' }]}>Carried forward</Text>
      </View>
    </View>
  );
}

/** One voucher — web `LedgerCard` without its photo strip and action buttons. */
export function LedgerCard({ entry }: { entry: DisplayEntry }) {
  const theme = useAppTheme();
  const reversed = entry.status === 'reversed';
  const isDebit = entry.debit > 0;
  const strike = reversed ? ({ textDecorationLine: 'line-through' } as const) : null;
  const cell = (label: string, value: string, color?: string) => (
    <View style={styles.cell}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: color ?? theme.colors.text, fontWeight: '600', flexShrink: 1 }, strike]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
  return (
    <Card style={[styles.card, reversed && { opacity: 0.6 }]}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }, strike]} numberOfLines={1}>
            {entry.ledgerHeadName}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            <Text style={{ fontFamily: 'monospace' }}>{entry.voucherNo}</Text> · {formatDisplayDate(entry.entryDate)}
          </Text>
        </View>
        <StatusBadge label={LEDGER_STATUS_LABELS[entry.status]} variant={STATUS_VARIANT[entry.status]} />
      </View>
      {entry.description ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 8 }, strike]}>{entry.description}</Text>
      ) : null}
      <View style={styles.grid}>
        {cell(isDebit ? 'Debit' : 'Credit', formatMoney2(isDebit ? entry.debit : entry.credit), isDebit ? theme.colors.success : theme.colors.danger)}
        {cell('Balance', formatMoney2(entry.balance))}
        {cell('Branch', entry.branchName ?? '—')}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, padding: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  panelRow: { paddingVertical: 8, gap: 2 },
  rowLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  pushRight: { marginLeft: 'auto' },
  banner: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  errorCard: { padding: 16, gap: 8 },
  strip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  totals: { borderWidth: 1, padding: 12, gap: 6, marginTop: 4 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  card: { padding: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, rowGap: 6 },
  cell: { flexBasis: '50%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, paddingRight: 10 },
});
