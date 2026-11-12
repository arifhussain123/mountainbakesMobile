import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { DailySaleRecord } from '@/api';

export interface DailySaleRecordDetailSheetProps {
  record: DailySaleRecord;
}

const STATUS_LABEL: Record<DailySaleRecord['status'], string> = {
  open: 'Open',
  pending_verification: 'Pending Verification',
  verified: 'Verified',
  locked: 'Locked',
  amended: 'Amended',
};

const STATUS_VARIANT: Record<DailySaleRecord['status'], StatusVariant> = {
  open: 'warning',
  pending_verification: 'info',
  verified: 'success',
  locked: 'neutral',
  amended: 'neutral',
};

function Row({
  label,
  value,
  explanation,
  danger,
  success,
}: {
  label: string;
  value: string;
  explanation?: string;
  danger?: boolean;
  success?: boolean;
}) {
  const theme = useAppTheme();
  const valueColor = danger ? theme.colors.danger : success ? theme.colors.success : theme.colors.text;
  return (
    <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
      <View style={styles.between}>
        <Text style={[styles.sm, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.amt, { color: valueColor }]}>{value}</Text>
      </View>
      {explanation ? <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{explanation}</Text> : null}
    </View>
  );
}

function ChannelRow({ label, auto, manual, diff }: { label: string; auto: number; manual: number | null; diff: number | null }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.tr, { borderTopColor: theme.colors.border }]}>
      <Text style={[styles.td, styles.grow, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[styles.td, styles.c, { color: theme.colors.textSecondary }]}>{formatCurrency(auto)}</Text>
      <Text style={[styles.td, styles.c, { color: theme.colors.text }]}>{manual === null ? '—' : formatCurrency(manual)}</Text>
      <Text
        style={[
          styles.td,
          styles.c,
          { fontWeight: '700', color: diff === null ? theme.colors.textFaint : diff === 0 ? theme.colors.success : theme.colors.danger },
        ]}>
        {diff === null ? '—' : formatCurrency(diff)}
      </Text>
    </View>
  );
}

/** Day Detail — every figure with a one-line explanation, per-channel counted-vs-system, and the status/verification trail. The caller (a bottom sheet or a scrolling screen) owns any outer scroll container. */
export function DailySaleRecordDetailSheet({ record }: DailySaleRecordDetailSheetProps) {
  const theme = useAppTheme();
  const th = [styles.th, { color: theme.colors.textFaint }];

  return (
    <View>
      <View style={[styles.between, styles.head]}>
        <Text style={[styles.h3, { color: theme.colors.text }]}>{formatDisplayDate(record.businessDate)}</Text>
        <StatusBadge label={STATUS_LABEL[record.status]} variant={STATUS_VARIANT[record.status]} />
      </View>

      <Row
        label="Branch Share"
        value={formatCurrency(record.branchShare)}
        explanation={`Total Sale × ${record.branchSharePct}% — Admin's configured branch share.`}
        success
      />
      <Row label="Total Sale" value={formatCurrency(record.autoTotalSale)} explanation="Cash + Easypaisa + Foodpanda + Bank." />
      <Row
        label="Company Share"
        value={formatCurrency(record.companyShare)}
        explanation={`Total Sale × ${record.companySharePct}% — this branch's configured company share.`}
      />
      <Row
        label="Cash on Table"
        value={formatCurrency(record.expectedCashInHand)}
        explanation={`Cash ${formatCurrency(record.autoCash)} − cash paid out of the till ${formatCurrency(record.cashExpense)}.`}
        danger={record.expectedCashInHand < 0}
      />
      <Row label="Discount" value={formatCurrency(record.discount)} />
      <Row label="Total Expenses" value={formatCurrency(record.expenseTotal)} explanation="Every shop expense for the day, whatever it was paid with." />

      <Text style={[styles.h3, styles.section, { color: theme.colors.text }]}>Counted vs system</Text>
      <View style={[styles.tr, styles.thRow]}>
        <Text style={[...th, styles.grow]}>Channel</Text>
        <Text style={[...th, styles.c]}>System</Text>
        <Text style={[...th, styles.c]}>Counted</Text>
        <Text style={[...th, styles.c]}>Diff</Text>
      </View>
      <ChannelRow label="Cash" auto={record.autoCash} manual={record.manualCash} diff={record.cashDifference} />
      <ChannelRow label="Easypaisa" auto={record.autoEasypaisa} manual={record.manualEasypaisa} diff={record.easypaisaDifference} />
      <ChannelRow label="Bank" auto={record.autoBank} manual={record.manualBank} diff={record.bankDifference} />
      {record.autoFoodpanda !== 0 ? (
        <Text style={[styles.xs, styles.note, { color: theme.colors.textFaint }]}>
          Foodpanda {formatCurrency(record.autoFoodpanda)} — settled by the aggregator, never counted here.
        </Text>
      ) : null}

      {record.verifiedAt ? (
        <Text style={[styles.xs, styles.trail, { color: theme.colors.textSecondary }]}>
          Verified by {record.verifiedByName ?? 'Admin'} · {formatDisplayDate(record.verifiedAt.slice(0, 10))} {formatDisplayTime(record.verifiedAt)}
        </Text>
      ) : record.fedAt ? (
        <Text style={[styles.xs, styles.trail, { color: theme.colors.textSecondary }]}>
          Last counted by {record.fedByName ?? 'Branch'} · {formatDisplayTime(record.fedAt)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: 4 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  row: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 2 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  sm: { fontSize: 13, lineHeight: 18 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  amt: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  section: { marginTop: 20, marginBottom: 4 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  thRow: { paddingVertical: 6, borderTopWidth: 0 },
  th: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'right' },
  td: { fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'], textAlign: 'right' },
  grow: { flex: 1, minWidth: 0, textAlign: 'left' },
  c: { width: 78 },
  note: { marginTop: 8 },
  trail: { marginTop: 16 },
});
