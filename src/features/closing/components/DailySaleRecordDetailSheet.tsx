import { Text, View } from 'react-native';
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
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[theme.typography.body, { color: valueColor, fontWeight: '700' }]}>{value}</Text>
      </View>
      {explanation ? <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 2 }]}>{explanation}</Text> : null}
    </View>
  );
}

function ChannelRow({ label, auto, manual, diff }: { label: string; auto: number; manual: number | null; diff: number | null }) {
  const theme = useAppTheme();
  return (
    <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
      <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1 }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, width: 80, textAlign: 'right' }]}>
        {formatCurrency(auto)}
      </Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, width: 80, textAlign: 'right' }]}>
        {manual === null ? '—' : formatCurrency(manual)}
      </Text>
      <Text
        style={[
          theme.typography.bodySmall,
          { width: 80, textAlign: 'right', fontWeight: '700', color: diff === null ? theme.colors.textFaint : diff === 0 ? theme.colors.success : theme.colors.danger },
        ]}>
        {diff === null ? '—' : formatCurrency(diff)}
      </Text>
    </View>
  );
}

/** Day Detail — every figure with a one-line explanation, per-channel counted-vs-system, and the status/verification trail. The caller (a bottom sheet or a scrolling screen) owns any outer scroll container. */
export function DailySaleRecordDetailSheet({ record }: DailySaleRecordDetailSheetProps) {
  const theme = useAppTheme();

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatDisplayDate(record.businessDate)}</Text>
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

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 20 }]}>COUNTED VS SYSTEM</Text>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, flex: 1 }]}>Channel</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, width: 80, textAlign: 'right' }]}>System</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, width: 80, textAlign: 'right' }]}>Counted</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, width: 80, textAlign: 'right' }]}>Diff</Text>
      </View>
      <ChannelRow label="Cash" auto={record.autoCash} manual={record.manualCash} diff={record.cashDifference} />
      <ChannelRow label="Easypaisa" auto={record.autoEasypaisa} manual={record.manualEasypaisa} diff={record.easypaisaDifference} />
      <ChannelRow label="Bank" auto={record.autoBank} manual={record.manualBank} diff={record.bankDifference} />
      {record.autoFoodpanda !== 0 ? (
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 10 }]}>
          Foodpanda {formatCurrency(record.autoFoodpanda)} — settled by the aggregator, never counted here.
        </Text>
      ) : null}

      {record.verifiedAt ? (
        <View style={{ marginTop: 20 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            Verified by {record.verifiedByName ?? 'Admin'} · {formatDisplayDate(record.verifiedAt.slice(0, 10))} {formatDisplayTime(record.verifiedAt)}
          </Text>
        </View>
      ) : record.fedAt ? (
        <View style={{ marginTop: 20 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            Last counted by {record.fedByName ?? 'Branch'} · {formatDisplayTime(record.fedAt)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
