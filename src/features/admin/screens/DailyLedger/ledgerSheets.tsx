import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  generateIdempotencyKey,
  isApiError,
  useApproveFinanceCashTransfer,
  useRejectFinanceCashTransfer,
  type CashTransfer,
} from '@/api';
import { formatMoney2 } from '@/features/finance/utils/financeFormat';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, PrimaryButton, SecondaryButton, TextField } from '@/shared/ui';
import {
  DECISION_TEXT_MAX,
  approveBody,
  approveSuccessMessage,
  rejectReasonProblem,
  rejectSuccessMessage,
} from '../../utils/ledgerActions';
import { shortBranch } from './ledgerDisplay';

/**
 * A lost race ("already approved by someone else", "the finance day is
 * closed") comes back as a 409 with the server's own sentence, which the web
 * shows verbatim — it is the one message that says what actually happened.
 */
function decisionError(e: unknown): string {
  return isApiError(e) && e.status === 409 ? e.message : mapErrorToMessage(e);
}

/** Web `CashDepositBreakdown` inside the Approve dialog's summary box. */
function TransferSummary({ transfer }: { transfer: CashTransfer }) {
  const theme = useAppTheme();
  const row = (label: string, value: string, strong?: boolean, mono?: boolean) => (
    <View style={styles.row} key={label}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          theme.typography.bodySmall,
          { color: theme.colors.text, fontWeight: strong ? '700' : '500' },
          mono && { fontFamily: 'monospace' },
        ]}>
        {value}
      </Text>
    </View>
  );
  return (
    <View style={[styles.summary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      {row('Branch', shortBranch(transfer.branchName), true)}
      <View style={[styles.breakdown, { borderColor: theme.colors.border }]}>
        {row('Cash', formatMoney2(transfer.cashAmount))}
        {row('Easypaisa', formatMoney2(transfer.easypaisaAmount))}
        {row('Bank', formatMoney2(transfer.bankAmount))}
        {row('Total Amount', formatMoney2(transfer.amount), true)}
        {row('Fuel Charges', formatMoney2(transfer.fuelCharges))}
      </View>
      {row('Transfer ID', transfer.transferNo, false, true)}
    </View>
  );
}

function Buttons({ busy, label, disabled, onCancel, onSave }: {
  busy: boolean;
  label: string;
  disabled?: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.buttons}>
      <View style={{ flex: 1 }}>
        <SecondaryButton label="Cancel" onPress={onCancel} disabled={busy} />
      </View>
      <View style={{ flex: 1.4 }}>
        <PrimaryButton label={label} onPress={onSave} loading={busy} disabled={disabled} />
      </View>
    </View>
  );
}

/**
 * Web `ApproveCashTransferDialog`: an RV- receipt is posted for the Total
 * under Company Share (and one for fuel when there is any). One idempotency
 * key per opening, reused across retries, so a retry after a dropped
 * connection is the same request.
 */
function ApproveForm({ transfer, onClose }: { transfer: CashTransfer; onClose: () => void }) {
  const theme = useAppTheme();
  const approve = useApproveFinanceCashTransfer();
  const key = useRef(generateIdempotencyKey('finance_cash_transfer_approve'));
  const [note, setNote] = useState('');

  const save = () => {
    if (approve.isPending) return;
    approve.mutate(
      { id: transfer.id, input: approveBody(note), idempotencyKey: key.current },
      {
        onSuccess: (result) => {
          Alert.alert('Approved', approveSuccessMessage(transfer.transferNo, result.ledgerEntry));
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Approve This Transfer', decisionError(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
        An RV- receipt is posted to the Daily Ledger for the amount below, under Company Share, with the branch's own photo. The transfer becomes
        final.
      </Text>
      <TransferSummary transfer={transfer} />
      <TextField
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={DECISION_TEXT_MAX}
        editable={!approve.isPending}
        placeholder="Recorded on the transfer; the branch sees it."
      />
      <Buttons busy={approve.isPending} label="Confirm Approval" onCancel={onClose} onSave={save} />
    </View>
  );
}

/**
 * Web `RejectCashTransferDialog`: nothing is booked; the record and its photo
 * are kept and the branch sees the reason. The sheet IS the web's confirmation
 * — a typed reason and a deliberate Reject press.
 */
function RejectForm({ transfer, onClose }: { transfer: CashTransfer; onClose: () => void }) {
  const theme = useAppTheme();
  const reject = useRejectFinanceCashTransfer();
  const key = useRef(generateIdempotencyKey('finance_cash_transfer_reject'));
  const [reason, setReason] = useState('');
  const problem = rejectReasonProblem(reason);

  const save = () => {
    if (problem || reject.isPending) return;
    reject.mutate(
      { id: transfer.id, input: { reason: reason.trim() }, idempotencyKey: key.current },
      {
        onSuccess: () => {
          Alert.alert('Rejected', rejectSuccessMessage(transfer.transferNo));
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Reject This Transfer', decisionError(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {shortBranch(transfer.branchName)} is refused {formatMoney2(transfer.amount)} ({transfer.transferNo}). Nothing is booked; the record and its
        photo are kept, and the branch sees your reason.
      </Text>
      <TextField
        label="Rejection Reason"
        required
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={DECISION_TEXT_MAX}
        editable={!reject.isPending}
        placeholder="What does not match — the amount, the slip, the date?"
        error={reason !== '' && problem ? problem : undefined}
      />
      <Buttons busy={reject.isPending} label="Reject" disabled={!!problem} onCancel={onClose} onSave={save} />
    </View>
  );
}

export type LedgerSheet = { kind: 'approve' | 'reject'; transfer: CashTransfer };

const TITLE: Record<LedgerSheet['kind'], string> = {
  approve: 'Approve this cash transfer?',
  reject: 'Reject Cash Transfer',
};

/**
 * One bottom sheet for the Daily Ledger's two decisions. `open(sheet)`
 * presents it; the form mounts only while open, so each opening starts clean
 * with a fresh idempotency key.
 */
export function useLedgerSheet() {
  const ref = useRef<BottomSheetModal>(null);
  const [sheet, setSheet] = useState<LedgerSheet | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: LedgerSheet) => {
    setSheet(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet
      ref={ref}
      title={sheet ? TITLE[sheet.kind] : ''}
      subtitle={sheet?.transfer.transferNo}
      onRequestClose={close}
      onDismiss={() => setSheet(null)}>
      {sheet?.kind === 'approve' ? <ApproveForm transfer={sheet.transfer} onClose={close} /> : null}
      {sheet?.kind === 'reject' ? <RejectForm transfer={sheet.transfer} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, padding: 12, gap: 6 },
  breakdown: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 6, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
