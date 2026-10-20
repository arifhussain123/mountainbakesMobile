import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  useDeleteSupportCashDeposit,
  useDeleteSupportDemand,
  useEditSupportTicket,
  useResolveSupportTicket,
  type SupportTicket,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, TextField } from '@/shared/ui';
import { changeEditorFor, confirmNumberMatches, deleteDemandSuccess, deleteReasonValid, editMessageProblem, type ChangeEditor } from '../../utils/supportActions';
import { Hint, Notice, SheetButtons } from './formBits';
import {
  CashDepositEditor,
  DemandItemsEditor,
  FieldEditor,
  LiveReferenceGate,
  NothingToChange,
  ProductionStockEditor,
  SaleItemsEditor,
  StockFiguresEditor,
} from './supportEditors';

interface FormProps {
  ticket: SupportTicket;
  onClose: () => void;
  onDone: () => void;
}

/** Web ViewDialog's "Mark Resolved" with its optional resolution note. */
function ResolveForm({ ticket, onClose, onDone }: FormProps) {
  const resolve = useResolveSupportTicket();
  const [note, setNote] = useState('');
  const save = () =>
    resolve.mutate(
      { id: ticket.id, status: 'resolved', resolutionNote: note },
      {
        onSuccess: () => {
          Alert.alert('Resolved', 'Query resolved');
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Resolve', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <TextField label="Resolution note (optional)" value={note} onChangeText={setNote} multiline placeholder="What was done" />
      <SheetButtons busy={resolve.isPending} label="Mark Resolved" onCancel={onClose} onSave={save} />
    </View>
  );
}

/** Web EditDialog: the issue text and the note. */
function EditForm({ ticket, onClose, onDone }: FormProps) {
  const theme = useAppTheme();
  const edit = useEditSupportTicket();
  const [message, setMessage] = useState(ticket.message);
  const [note, setNote] = useState(ticket.resolutionNote ?? '');
  const save = () => {
    const problem = editMessageProblem(message);
    if (problem) {
      Alert.alert('Issue Needed', problem);
      return;
    }
    edit.mutate(
      { id: ticket.id, message, resolutionNote: note },
      {
        onSuccess: () => {
          Alert.alert('Updated', 'Ticket updated');
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Update', mapErrorToMessage(e)),
      },
    );
  };
  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Adjust the issue text or add an internal note.</Text>
      <TextField label="Issue" value={message} onChangeText={setMessage} multiline />
      <TextField label="Note" value={note} onChangeText={setNote} multiline />
      <SheetButtons busy={edit.isPending} label="Save" onCancel={onClose} onSave={save} disabled={message.trim().length < 3} />
    </View>
  );
}

/** Web RejectDialog — the reason goes back to the raiser. */
function RejectForm({ ticket, onClose, onDone }: FormProps) {
  const theme = useAppTheme();
  const resolve = useResolveSupportTicket();
  const [note, setNote] = useState('');
  const save = () =>
    resolve.mutate(
      { id: ticket.id, status: 'rejected', resolutionNote: note },
      {
        onSuccess: () => {
          Alert.alert('Rejected', 'Query rejected');
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Let the raiser know why this query is being rejected.</Text>
      <TextField label="Reason" value={note} onChangeText={setNote} multiline placeholder="Why this can't be actioned" />
      <SheetButtons busy={resolve.isPending} label="Reject Query" onCancel={onClose} onSave={save} />
    </View>
  );
}

/**
 * Web DeleteDemandDialog — the one irreversible action here, so the demand
 * number is typed out and a reason of 5+ is required (the server re-checks both).
 */
function DeleteDemandForm({ ticket, stockMoved, onClose, onDone }: FormProps & { stockMoved: boolean }) {
  const theme = useAppTheme();
  const remove = useDeleteSupportDemand();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [note, setNote] = useState('');
  const demandNumber = ticket.referenceId ?? '';
  const ready = confirmNumberMatches(confirm, demandNumber) && deleteReasonValid(reason);
  const save = () =>
    remove.mutate(
      { id: ticket.id, reason, confirmDemandNumber: confirm, note },
      {
        onSuccess: (res) => {
          Alert.alert('Demand Deleted', deleteDemandSuccess(demandNumber, res));
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Delete the Demand', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>This permanently removes the demand and every line on it. It cannot be undone.</Text>
      {stockMoved ? (
        <Notice tone="danger">
          This demand has already been delivered. Deleting it gives the stock back to the production pool and takes it off the branch — the branch’s balance will
          drop by everything this demand credited.
        </Notice>
      ) : (
        <Notice tone="muted">This demand never delivered, so no stock moves. Only the demand itself is removed.</Notice>
      )}
      <Hint>
        The stock ledger keeps both the original movements and the reversal, and a full copy of the demand is written to the audit log — so the figures stay
        explainable after it is gone.
      </Hint>
      <TextField
        label="Reason (required, kept in the audit log)"
        value={reason}
        onChangeText={setReason}
        placeholder="Why this demand is being deleted"
        error={reason.length > 0 && !deleteReasonValid(reason) ? 'Give at least a few words.' : undefined}
      />
      <TextField label={`Type ${demandNumber} to confirm`} value={confirm} onChangeText={setConfirm} placeholder={demandNumber} autoCapitalize="characters" autoCorrect={false} />
      <TextField label="Resolution note (sent to the raiser)" value={note} onChangeText={setNote} multiline placeholder="What was done" />
      <SheetButtons busy={remove.isPending} label="Delete demand" onCancel={onClose} onSave={save} disabled={!ready} />
    </View>
  );
}

/** Web DeleteCashDepositDialog — the deposit and every ledger entry it produced are removed; nothing is posted in their place. */
function DeleteDepositForm({ ticket, onClose, onDone }: FormProps) {
  const theme = useAppTheme();
  const remove = useDeleteSupportCashDeposit();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [note, setNote] = useState('');
  const transferNo = ticket.referenceId ?? '';
  const ready = confirmNumberMatches(confirm, transferNo) && deleteReasonValid(reason);
  const save = () =>
    remove.mutate(
      { id: ticket.id, reason, confirmTransferNo: confirm, note },
      {
        onSuccess: () => {
          Alert.alert('Deposit Deleted', 'Cash deposit deleted successfully.');
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Delete the Cash Deposit', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        The deposit is removed, and so is every ledger entry it produced. Nothing is posted in their place.
      </Text>
      <Notice tone="danger">
        If this deposit was approved, its RV- entries leave the Daily Ledger and the running balance is recomputed. It drops out of the branch’s lists and the
        production slip. This cannot be undone.
      </Notice>
      <TextField
        label="Reason (required, kept in the audit log)"
        value={reason}
        onChangeText={setReason}
        placeholder="Why this deposit is being deleted"
        error={reason.length > 0 && !deleteReasonValid(reason) ? 'Give at least a few words.' : undefined}
      />
      <TextField label={`Type ${transferNo} to confirm`} value={confirm} onChangeText={setConfirm} placeholder={transferNo} autoCapitalize="characters" autoCorrect={false} />
      <TextField label="Resolution note (sent to the raiser)" value={note} onChangeText={setNote} multiline placeholder="What was done" />
      <SheetButtons busy={remove.isPending} label="Delete cash deposit" onCancel={onClose} onSave={save} disabled={!ready} />
    </View>
  );
}

export type SupportTicketSheet =
  | { kind: 'resolve' | 'edit' | 'reject' | 'deleteDeposit' | 'change' }
  | { kind: 'deleteDemand'; stockMoved: boolean };

function titleOf(sheet: SupportTicketSheet, ticket: SupportTicket, editor: ChangeEditor): string {
  switch (sheet.kind) {
    case 'resolve':
      return 'Mark Resolved';
    case 'edit':
      return `Edit ${ticket.ticketNumber}`;
    case 'reject':
      return `Reject ${ticket.ticketNumber}`;
    case 'deleteDeposit':
      return `Delete cash deposit — ${ticket.referenceId}`;
    case 'deleteDemand':
      return `Delete demand — ${ticket.referenceId}`;
    case 'change':
      return editor === 'sale'
        ? `Edit sale — ${ticket.referenceId}`
        : editor === 'demand'
          ? `Edit demand — ${ticket.referenceId}`
          : editor === 'stock'
            ? `Correct stock — ${ticket.referenceId}`
            : editor === 'pool'
              ? `Correct production stock — ${ticket.referenceId}`
              : editor === 'deleteDemand'
                ? `Delete demand — ${ticket.referenceId}`
                : editor === 'nothing'
                  ? 'Nothing to correct'
                  : `Change figures — ${ticket.referenceId}`;
  }
}

/**
 * One bottom sheet for every action on a Branches & Production query —
 * `open(sheet)` presents it; the form mounts only while open so each opening
 * starts clean. "Change figures" routes to the editor the reference deserves
 * (web `ChangeDialog`); the demand and deposit editors hand over to their
 * delete forms in place.
 */
export function useSupportTicketSheet(ticket: SupportTicket | null, onDone: () => void) {
  const ref = useRef<BottomSheetModal>(null);
  const [sheet, setSheet] = useState<SupportTicketSheet | null>(null);
  const close = () => ref.current?.dismiss();
  const done = () => {
    close();
    onDone();
  };

  const open = (next: SupportTicketSheet) => {
    setSheet(next);
    ref.current?.present();
  };

  const editor = ticket ? changeEditorFor(ticket) : 'nothing';
  const props = ticket ? { ticket, onClose: close, onDone: done } : null;

  const body = (() => {
    if (!sheet || !props) return null;
    switch (sheet.kind) {
      case 'resolve':
        return <ResolveForm {...props} />;
      case 'edit':
        return <EditForm {...props} />;
      case 'reject':
        return <RejectForm {...props} />;
      case 'deleteDeposit':
        return <DeleteDepositForm {...props} />;
      case 'deleteDemand':
        return <DeleteDemandForm {...props} stockMoved={sheet.stockMoved} />;
      case 'change':
        switch (editor) {
          case 'nothing':
            return <NothingToChange cashDeposit={props.ticket.referenceSnapshot?.type === 'cash_transfer'} onClose={close} />;
          case 'deleteDemand':
            return <DeleteDemandForm {...props} stockMoved={props.ticket.referenceSnapshot?.demandStockMoved === true} />;
          case 'fields':
            return <FieldEditor {...props} />;
          case 'sale':
            return (
              <LiveReferenceGate ticket={props.ticket} label="Re-reading the live sale…">
                {(r) => (r ? <SaleItemsEditor {...props} reference={r} /> : null)}
              </LiveReferenceGate>
            );
          case 'demand':
            return (
              <LiveReferenceGate ticket={props.ticket} label="Reading the demand’s live figures…">
                {(r) => (r ? <DemandItemsEditor {...props} reference={r} onDelete={(stockMoved) => setSheet({ kind: 'deleteDemand', stockMoved })} /> : null)}
              </LiveReferenceGate>
            );
          case 'stock':
            return (
              <LiveReferenceGate ticket={props.ticket} label="Loading current stock…">
                {(r) => <StockFiguresEditor {...props} reference={r} />}
              </LiveReferenceGate>
            );
          case 'pool':
            return (
              <LiveReferenceGate ticket={props.ticket} label="Loading current pool figures…">
                {(r) => <ProductionStockEditor {...props} reference={r} />}
              </LiveReferenceGate>
            );
          case 'deposit':
            return (
              <LiveReferenceGate ticket={props.ticket} label="Loading the deposit as it stands now…">
                {(r) => <CashDepositEditor {...props} reference={r} onDelete={() => setSheet({ kind: 'deleteDeposit' })} />}
              </LiveReferenceGate>
            );
        }
    }
    return null;
  })();

  const element = (
    <FormBottomSheet
      ref={ref}
      title={sheet && ticket ? titleOf(sheet, ticket, editor) : ''}
      subtitle={ticket ? `${ticket.ticketNumber} · ${ticket.referenceId}` : undefined}
      onRequestClose={close}
      onDismiss={() => setSheet(null)}>
      {body}
    </FormBottomSheet>
  );

  return { open, element };
}
