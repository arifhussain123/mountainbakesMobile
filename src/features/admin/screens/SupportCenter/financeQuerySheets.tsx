import { useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  getBusinessDate,
  useAdminUsers,
  useAssignFinanceTicket,
  useBranches,
  useCorrectFinanceRecord,
  useDeleteFinanceRecord,
  useDeleteFinanceTicket,
  useFeedFinanceTicket,
  useLedgerHeads,
  useLookupFinanceTicketReference,
  useRequestReopenFinanceTicket,
  useRestoreFinanceTicket,
  useSaveFinanceTicketResponse,
  useSetFinanceTicketStatus,
  type FinanceQueryPriority,
  type FinanceQueryType,
  type FinanceResolutionType,
  type FinanceTicket,
  type FinanceTicketReferenceLookup,
  type FinanceTicketStatus,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { DateField, Dropdown, FormBottomSheet, TextField, type DropdownOption } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { ActionChip } from '../../components';
import {
  FINANCE_AMENDABLE_FIELDS,
  FINANCE_QUERY_TYPE_REFERENCE_FIELDS,
  FINANCE_RESOLUTION_TYPES,
  FINANCE_RESOLUTION_TYPE_LABELS,
  FINANCE_TICKET_TRANSITIONS,
  correctionChanges,
  correctionFailureMessage,
  correctionInvalid,
  correctionPayload,
  deleteConfirmed,
  feedChangeLabels,
  feedDiff,
  feedFromTicket,
  financeAmendableValue,
  isApprovedRecord,
  isCorrectionConflict,
  moneyChars,
  quickFeedProblem,
  quickFeedSuccess,
  reasonValid,
  responseFormFrom,
  responsePayload,
  statusDescription,
  statusFormFrom,
  statusPayload,
  type FeedState,
  type FinanceAmendableField,
  type QuickFeedMode,
  type RecordChange,
} from '../../utils/financeQueryActions';
import { FieldRow, TextBlock } from './components';
import { ConfirmTick, Hint, NumBox, Notice, SheetButtons, formStyles } from './formBits';
import { FIN_PRIORITIES, FIN_PRIORITY_LABEL, FIN_QUERY_TYPES, FIN_QUERY_TYPE_LABEL, FIN_REFERENCE_LABEL, FIN_STATUS_LABEL, recordRows } from './labels';

interface FormProps {
  ticket: FinanceTicket;
  onClose: () => void;
}

const NONE = '__none__';
const money = (n: number) => formatCurrency(Number.isFinite(n) ? n : 0);
const signedMoney = (d: number) => `${d > 0 ? '+' : '−'}${money(Math.abs(d))}`;

// ─── Edit / Amend / Recreate — the feeding form ─────────────────────────────

const FEED_COPY: Record<QuickFeedMode, { description: string; button: string; placeholder: string }> = {
  edit: {
    description: 'Changes the query, not the financial record behind it. The previous values are kept as a version and the raiser is told why.',
    button: 'Save changes',
    placeholder: 'e.g. Corrected transaction amount',
  },
  amend: {
    description: 'Saves the form as a new version, marks the query AMENDED and keeps every previous version. Nothing on the books changes.',
    button: 'Amend query',
    placeholder: 'e.g. Corrected transaction amount',
  },
  recreate: {
    description: 'Creates a NEW query under a new Query ID with the form as it stands. This query is left as it is and both point at each other.',
    button: 'Recreate query',
    placeholder: 'Why the original needs to be submitted again',
  },
};

/** Web QuickFeedDialog + QueryFeedForm — the same fields the raiser filled, and a reason. */
function FeedForm({ ticket, mode, onClose, onRecreated }: FormProps & { mode: QuickFeedMode; onRecreated: (id: string) => void }) {
  const theme = useAppTheme();
  const feedMutation = useFeedFinanceTicket();
  const lookup = useLookupFinanceTicketReference();
  const branchesQ = useBranches();
  const base = useMemo(() => feedFromTicket(ticket), [ticket]);
  const [feed, setFeed] = useState<FeedState>(base);
  const [reason, setReason] = useState('');
  const [found, setFound] = useState<FinanceTicketReferenceLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const diff = useMemo(() => feedDiff(base, feed), [base, feed]);
  const dirty = Object.keys(diff).length > 0;
  const set = <K extends keyof FeedState>(key: K, v: FeedState[K]) => setFeed((p) => ({ ...p, [key]: v }));
  const handles = FINANCE_QUERY_TYPE_REFERENCE_FIELDS[feed.queryType] ?? [];
  const copy = FEED_COPY[mode];

  const branchOptions = useMemo<DropdownOption<string>[]>(
    () => [{ value: NONE, label: '— None —' }, ...(branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branchesQ.data],
  );

  const find = () => {
    const ref = feed.referenceNo.trim();
    if (!ref) return;
    setFound(null);
    setLookupError('');
    lookup.mutate(ref, {
      onSuccess: (r) => {
        setFound(r);
        set('referenceNo', r.referenceNo);
      },
      onError: (e) => setLookupError(mapErrorToMessage(e) || 'Could not find that reference'),
    });
  };

  const save = () => {
    const problem = quickFeedProblem(mode, feed, diff, reason);
    if (problem) {
      Alert.alert('Check the Query', problem);
      return;
    }
    feedMutation.mutate(
      { id: ticket.id, mode, body: { ...diff, reason: reason.trim() } },
      {
        onSuccess: (result) => {
          Alert.alert(mode === 'edit' ? 'Updated' : mode === 'amend' ? 'Amended' : 'Recreated', quickFeedSuccess(mode, ticket.queryNo, result?.queryNo));
          onClose();
          if (mode === 'recreate' && result?.id) onRecreated(result.id);
        },
        onError: (e) => Alert.alert('Could Not Save the Change', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{copy.description}</Text>
      <TextField label="Subject" value={feed.subject} onChangeText={(v) => set('subject', v)} placeholder="Short summary, e.g. Branch share difference" />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: 14, marginBottom: 6 }]}>Query type</Text>
      <Dropdown<FinanceQueryType> options={FIN_QUERY_TYPES.map((t) => ({ value: t, label: FIN_QUERY_TYPE_LABEL[t] }))} value={feed.queryType} onChange={(v) => set('queryType', v)} />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: 14, marginBottom: 6 }]}>Priority</Text>
      <Dropdown<FinanceQueryPriority> options={FIN_PRIORITIES.map((p) => ({ value: p, label: FIN_PRIORITY_LABEL[p] }))} value={feed.priority} onChange={(v) => set('priority', v)} />
      <TextField label="Amount" value={feed.amount} onChangeText={(v) => set('amount', moneyChars(v))} keyboardType="decimal-pad" placeholder="Optional" />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: 14, marginBottom: 6 }]}>Branch</Text>
      <Dropdown options={branchOptions} value={feed.branchId || NONE} onChange={(v) => set('branchId', v === NONE ? '' : v)} loading={branchesQ.isLoading} />
      <View style={{ marginTop: 16 }}>
        <DateField label="Business date" value={feed.businessDate} onChange={(v) => set('businessDate', v)} onClear={() => set('businessDate', '')} placeholder="Optional" />
      </View>
      <TextField label="Description" value={feed.description} onChangeText={(v) => set('description', v)} multiline placeholder="What looks wrong, and what you expected instead" />
      <TextField
        label="Reference ID"
        value={feed.referenceNo}
        onChangeText={(v) => {
          set('referenceNo', v);
          setFound(null);
          setLookupError('');
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="e.g. RV-000001 or CT-000001 — optional"
      />
      <View style={[formStyles.inline, { marginTop: 8 }]}>
        <ActionChip icon="search" label="Find" loading={lookup.isPending} disabled={!feed.referenceNo.trim()} onPress={find} />
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>A reference is checked when you save; Find shows its figures first.</Text>
      </View>
      {lookupError ? <Hint tone="danger">{lookupError}</Hint> : null}
      {found ? (
        <View style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', marginBottom: 4 }]}>
            {found.label} · {found.referenceNo}
          </Text>
          {recordRows(found.snapshot).map(([k, v]) => (
            <FieldRow key={k} label={k} value={v} />
          ))}
        </View>
      ) : null}
      {handles.includes('transactionRef') ? <TextField label="Transaction ID" value={feed.transactionRef} onChangeText={(v) => set('transactionRef', v)} placeholder="Optional" /> : null}
      {handles.includes('expenseRef') ? <TextField label="Expense ID" value={feed.expenseRef} onChangeText={(v) => set('expenseRef', v)} placeholder="Optional" /> : null}
      {handles.includes('incomeRef') ? <TextField label="Income ID" value={feed.incomeRef} onChangeText={(v) => set('incomeRef', v)} placeholder="Optional" /> : null}
      {handles.includes('voucherRef') ? <TextField label="Ledger / Voucher ID" value={feed.voucherRef} onChangeText={(v) => set('voucherRef', v)} placeholder="Optional" /> : null}
      <TextField label="Remarks" value={feed.remarks} onChangeText={(v) => set('remarks', v)} multiline placeholder="Optional" />
      <TextField label="Reason" value={reason} onChangeText={setReason} multiline placeholder={copy.placeholder} />
      {dirty ? <Hint>Changing: {feedChangeLabels(diff).join(', ')}</Hint> : null}
      {mode === 'edit' && !dirty ? <Hint>Change a field above to enable Save.</Hint> : null}
      <SheetButtons busy={feedMutation.isPending} label={copy.button} onCancel={onClose} onSave={save} />
    </View>
  );
}

// ─── Reason-only: Restore, Reopen ───────────────────────────────────────────

function RestoreForm({ ticket, onClose }: FormProps) {
  const theme = useAppTheme();
  const restore = useRestoreFinanceTicket();
  const [reason, setReason] = useState('');
  const save = () =>
    restore.mutate(
      { id: ticket.id, reason: reason.trim() },
      {
        onSuccess: () => {
          Alert.alert('Restored', `${ticket.queryNo} restored`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Restore the Query', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        Brings the query back to the desk exactly as it was when it was deleted, with its status and history.
      </Text>
      <TextField label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Kept with the previous values in the version history" />
      <SheetButtons busy={restore.isPending} label="Restore query" onCancel={onClose} onSave={save} disabled={!reasonValid(reason)} />
    </View>
  );
}

/** Web ReopenDialog (admin): back to Reopened; the current resolution is archived, readable in the history. */
function ReopenForm({ ticket, onClose }: FormProps) {
  const theme = useAppTheme();
  const reopen = useRequestReopenFinanceTicket();
  const [reason, setReason] = useState('');
  const disputed = ticket.adminResponse ?? ticket.resolutionNote;
  const save = () =>
    reopen.mutate(
      { id: ticket.id, input: { reason: reason.trim() } },
      {
        onSuccess: () => {
          Alert.alert('Reopened', `${ticket.queryNo} reopened`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Reopen the Query', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        The query goes back to Reopened and can be answered again. The current resolution is kept in full and stays readable in the history.
      </Text>
      {disputed ? (
        <TextBlock
          label={`The resolution being disputed${ticket.resolutionType ? ` · ${FINANCE_RESOLUTION_TYPE_LABELS[ticket.resolutionType]}` : ''}`}
          text={disputed}
        />
      ) : null}
      <TextField label="Reason" value={reason} onChangeText={setReason} multiline placeholder="What is still wrong with this?" />
      <SheetButtons busy={reopen.isPending} label="Reopen query" onCancel={onClose} onSave={save} disabled={!reasonValid(reason)} />
    </View>
  );
}

// ─── Status ─────────────────────────────────────────────────────────────────

/** Web StatusDialog: resolve / reject (resolution type + amount + response) or a working move. */
function StatusForm({ ticket, target, onClose }: FormProps & { target: FinanceTicketStatus }) {
  const theme = useAppTheme();
  const setStatus = useSetFinanceTicketStatus();
  const [form, setForm] = useState(() => statusFormFrom(ticket, target));
  const terminal = target === 'resolved' || target === 'rejected';
  const label = FIN_STATUS_LABEL[target];

  const save = () => {
    const built = statusPayload(ticket, target, form);
    if ('error' in built) {
      Alert.alert('Response Needed', built.error);
      return;
    }
    setStatus.mutate(
      { id: ticket.id, input: built.input },
      {
        onSuccess: () => {
          Alert.alert('Updated', `${ticket.queryNo} — ${label}`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Update the Query', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{statusDescription(target)}</Text>
      {terminal ? (
        <>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: 14, marginBottom: 6 }]}>Resolution type</Text>
          <Dropdown<FinanceResolutionType>
            options={FINANCE_RESOLUTION_TYPES.map((t) => ({ value: t, label: FINANCE_RESOLUTION_TYPE_LABELS[t] }))}
            value={form.resolutionType}
            onChange={(v) => setForm((p) => ({ ...p, resolutionType: v }))}
          />
          <TextField
            label="Resolution amount"
            value={form.amount}
            onChangeText={(v) => setForm((p) => ({ ...p, amount: moneyChars(v) }))}
            keyboardType="decimal-pad"
            placeholder="Optional — the correct figure"
          />
        </>
      ) : null}
      <TextField
        label={`Admin response${terminal ? '' : ' (optional)'}`}
        value={form.response}
        onChangeText={(v) => setForm((p) => ({ ...p, response: v }))}
        multiline
        placeholder={target === 'waiting_for_finance' ? 'What do you need from them?' : 'What you found, or what was done'}
      />
      {terminal ? (
        <>
          <TextField
            label="Resolution details (optional)"
            value={form.note}
            onChangeText={(v) => setForm((p) => ({ ...p, note: v }))}
            multiline
            placeholder="Any further detail for the record"
          />
          <Hint>A resolution amount is a statement on the query. It does not change any expense, income, sale, payment or ledger entry — use Correct record for that.</Hint>
        </>
      ) : null}
      <SheetButtons
        busy={setStatus.isPending}
        label={label}
        onCancel={onClose}
        onSave={save}
        disabled={terminal && !form.response.trim() && !form.note.trim()}
      />
    </View>
  );
}

// ─── Assign ─────────────────────────────────────────────────────────────────

/** Web AssignDialog — only an Admin can action a Help Desk query, so only Admins are offered. */
function AssignForm({ ticket, onClose }: FormProps) {
  const theme = useAppTheme();
  const usersQ = useAdminUsers();
  const assign = useAssignFinanceTicket();
  const [assignedTo, setAssignedTo] = useState<string>(ticket.assignedTo ?? NONE);
  const options = useMemo<DropdownOption<string>[]>(
    () => [
      { value: NONE, label: 'Unassigned' },
      ...(usersQ.data?.users ?? []).filter((u) => u.role === 'super_admin').map((u) => ({ value: u.id, label: u.displayName || u.email })),
    ],
    [usersQ.data],
  );
  const target = assignedTo === NONE ? null : assignedTo;
  const save = () =>
    assign.mutate(
      { id: ticket.id, assignedTo: target },
      {
        onSuccess: () => {
          Alert.alert('Saved', target ? `${ticket.queryNo} assigned` : `${ticket.queryNo} unassigned`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Assign the Query', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginBottom: 10 }]}>
        Only an Admin can action a Help Desk query, so only Admins appear here.
      </Text>
      <Dropdown options={options} value={assignedTo} onChange={setAssignedTo} loading={usersQ.isLoading} />
      <SheetButtons busy={assign.isPending} label="Save" onCancel={onClose} onSave={save} disabled={usersQ.isLoading || target === (ticket.assignedTo ?? null)} />
    </View>
  );
}

// ─── Admin Response ─────────────────────────────────────────────────────────

/** Web ResponsePanel (admin): answer while the query stays live — the status is not moved. */
function RespondForm({ ticket, onClose }: FormProps) {
  const theme = useAppTheme();
  const save = useSaveFinanceTicketResponse();
  const [form, setForm] = useState(() => responseFormFrom(ticket));
  const body = responsePayload(ticket, form);
  const changed = Object.keys(body).length > 0;
  const submit = () =>
    save.mutate(
      { id: ticket.id, body },
      {
        onSuccess: () => {
          Alert.alert('Saved', `${ticket.queryNo} — response saved`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Save the Response', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <TextField
        label="Admin response"
        value={form.response}
        onChangeText={(v) => setForm((p) => ({ ...p, response: v }))}
        multiline
        placeholder="What you found, or what was done. The raiser reads this."
      />
      <TextField label="Resolution" value={form.resolution} onChangeText={(v) => setForm((p) => ({ ...p, resolution: v }))} multiline placeholder="Optional — the closing detail" />
      <TextField
        label="Resolution amount"
        value={form.amount}
        onChangeText={(v) => setForm((p) => ({ ...p, amount: moneyChars(v) }))}
        keyboardType="decimal-pad"
        placeholder="Optional — the correct figure"
      />
      <Hint>A statement on the query. It changes no financial record.</Hint>
      <TextField
        label="Internal notes"
        value={form.internal}
        onChangeText={(v) => setForm((p) => ({ ...p, internal: v }))}
        multiline
        placeholder="Admin-only. The raiser never receives this field."
      />
      {ticket.respondedByName ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>Responded by {ticket.respondedByName}</Text>
      ) : null}
      <SheetButtons busy={save.isPending} label="Save response" onCancel={onClose} onSave={submit} disabled={!changed} />
    </View>
  );
}

// ─── Delete the query / the record ──────────────────────────────────────────

/** Web DeleteQueryDialog — soft: it leaves the desk, keeps its history, can be restored. The record is not touched. */
function DeleteQueryForm({ ticket, onClose }: FormProps) {
  const theme = useAppTheme();
  const remove = useDeleteFinanceTicket();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const save = () =>
    remove.mutate(
      { id: ticket.id, reason: reason.trim() },
      {
        onSuccess: () => {
          Alert.alert('Deleted', `${ticket.queryNo} deleted`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Delete the Query', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {ticket.queryNo} — {ticket.subject}
      </Text>
      <Notice>
        The query is marked deleted and leaves the desk. It is not erased: it stays under Deleted Queries, keeps its history, and can be restored. The financial
        record this query is about is not touched.
      </Notice>
      <TextField label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Why is this query being removed from the desk?" />
      <ConfirmTick checked={confirmed} onChange={setConfirmed} label="I want to delete this query." />
      <SheetButtons busy={remove.isPending} label="Delete query" onCancel={onClose} onSave={save} disabled={!deleteConfirmed(reason, confirmed)} />
    </View>
  );
}

/** Web DeleteRecordDialog — the record behind the query, removed from the books but kept on file. */
function DeleteRecordForm({ ticket, onClose }: FormProps) {
  const theme = useAppTheme();
  const remove = useDeleteFinanceRecord();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const save = () =>
    remove.mutate(
      { id: ticket.id, reason: reason.trim() },
      {
        onSuccess: () => {
          Alert.alert('Deleted', ticket.referenceType === 'cash_transfer' ? 'Cash deposit deleted successfully.' : `${ticket.referenceNo} deleted`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Delete the Record', mapErrorToMessage(e)),
      },
    );
  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        The record is removed from the books but kept on file — it stays readable to an Admin, stamped with your name, your reason and {ticket.queryNo}.
      </Text>
      <Notice tone="danger">
        Warning: you are about to modify an approved financial record. This action will be recorded in the audit trail.
        {ticket.referenceType === 'ledger_entry'
          ? ' This is a posted voucher: deleting it recomputes the running balance on every later entry. To correct a wrong figure without that, cancel and use Correct record instead.'
          : ''}
        {ticket.referenceType === 'cash_transfer'
          ? ' If this deposit was approved, its RV- entries are removed from the Daily Ledger with it and the running balance is recomputed. No reversal or other entry is posted in their place. The deposit drops out of the branch’s lists and the production slip.'
          : ''}
      </Notice>
      <TextField label="Reason" value={reason} onChangeText={setReason} multiline />
      <ConfirmTick checked={confirmed} onChange={setConfirmed} label="I confirm this financial record should be deleted." />
      <SheetButtons busy={remove.isPending} label="Delete record" onCancel={onClose} onSave={save} disabled={!deleteConfirmed(reason, confirmed)} />
    </View>
  );
}

// ─── Correct record (web ChangeFiguresDialog) ───────────────────────────────

const titleCase = (v: string) => v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/**
 * The record's correctable fields prefilled from the live row, "Was" and the
 * difference under each, a Changes list and an optional note — confirmed,
 * then applied in one transaction with the query's resolve. A concurrent
 * change answers 409 `conflict`; Reload latest re-seeds from the new row.
 */
function CorrectRecordForm({ ticket, onClose, onReload }: FormProps & { onReload: () => Promise<unknown> }) {
  const theme = useAppTheme();
  const correct = useCorrectFinanceRecord();
  const branchesQ = useBranches();
  const headsQ = useLedgerHeads();
  const live = ticket.liveRecord ?? null;
  const referenceType = ticket.referenceType!;
  const fields = useMemo<FinanceAmendableField[]>(() => FINANCE_AMENDABLE_FIELDS[referenceType] ?? [], [referenceType]);
  const current = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.key, financeAmendableValue(referenceType, live, f.key)])) as Record<string, string>,
    [fields, referenceType, live],
  );
  const currentKey = JSON.stringify(current);
  const [draft, setDraft] = useState<Record<string, string>>(current);
  const [seededFrom, setSeededFrom] = useState(currentKey);
  const [reloaded, setReloaded] = useState(false);
  const [note, setNote] = useState('');
  const [resolve, setResolve] = useState(true);
  // A newer record (after Reload latest) re-seeds the draft — adjusted during render.
  if (seededFrom !== currentKey) {
    setSeededFrom(currentKey);
    setDraft(current);
  }

  const recordDeleted = !live || Boolean(live.deletedAt);
  const approved = isApprovedRecord(live);
  const canResolve = FINANCE_TICKET_TRANSITIONS[ticket.status].includes('resolved') && !ticket.deletedAt;
  const willResolve = resolve && canResolve;
  const invalid = correctionInvalid(fields, draft);
  const changes = correctionChanges(fields, current, draft);
  const recordType = String(live?.ledgerHeadType ?? live?.txnType ?? '');
  const currentHeadName = String(live?.ledgerHeadName ?? '') || '—';
  const currentBranchName = String(live?.branchName ?? '') || '—';
  const heads = useMemo(() => (headsQ.data ?? []).filter((h) => !recordType || h.type === recordType), [headsQ.data, recordType]);
  const branches = useMemo(() => branchesQ.data?.branches ?? [], [branchesQ.data]);
  const today = useMemo(() => getBusinessDate(), []);

  const shown = (spec: FinanceAmendableField, v: string) => {
    if (spec.kind === 'money') return money(Number(v || 0));
    if (spec.kind === 'select') return spec.options?.find((o) => o.value === v)?.label ?? (v ? titleCase(v) : '—');
    if (spec.kind === 'date') return v ? formatDisplayDate(v) : '—';
    if (spec.kind === 'head') return heads.find((h) => h.id === v)?.name ?? (v === current[spec.key] ? currentHeadName : v) ?? '—';
    if (spec.kind === 'branch') return v ? (branches.find((b) => b.id === v)?.name ?? (v === current[spec.key] ? currentBranchName : v)) : 'Company-wide';
    return v ? `“${v}”` : '—';
  };

  const apply = () =>
    correct.mutate(
      { id: ticket.id, input: correctionPayload(ticket, changes, note, willResolve, approved) },
      {
        onSuccess: (res) => {
          const lines = res.applied.map((a) => {
            const spec = fields.find((f) => f.key === a.field);
            const from = spec ? shown(spec, a.originalValue ?? '') : (a.originalValue ?? '—');
            const to = spec ? shown(spec, a.newValue ?? '') : (a.newValue ?? '—');
            const ledger = a.ledger?.ledgerAmended ? `\n  ${a.ledger.reversalVoucherNo} reversal · ${a.ledger.correctedVoucherNo} corrected entry` : '';
            return `${a.label}: ${from} → ${to}${ledger}`;
          });
          Alert.alert(
            'Finance Record Corrected',
            `${willResolve ? `${ticket.referenceNo} corrected · ${ticket.queryNo} resolved` : `${ticket.referenceNo} corrected`}\n\n${lines.join('\n')}`,
          );
          onClose();
        },
        onError: (e) => {
          if (isCorrectionConflict(e)) {
            Alert.alert('The Record Changed', mapErrorToMessage(e), [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Reload latest',
                onPress: () => {
                  void onReload().then(() => setReloaded(true));
                },
              },
            ]);
            return;
          }
          Alert.alert('Could Not Apply the Correction', correctionFailureMessage(e, mapErrorToMessage));
        },
      },
    );

  const review = () => {
    if (invalid.length > 0) {
      Alert.alert('Check the Amounts', 'Enter an amount of 0 or more, with at most 2 decimals.');
      return;
    }
    if (changes.length === 0) {
      Alert.alert('Nothing Changed', 'No changes detected.');
      return;
    }
    const summary = [
      ...changes.map((c: RecordChange) => `${c.spec.label}: ${shown(c.spec, c.from)} → ${shown(c.spec, c.to)}`),
      ...(note.trim() ? ['', `Reason: ${note.trim()}`] : []),
      ...(approved ? ['', `${ticket.referenceNo} is an approved financial record. Applying overwrites it, and the change is recorded in the audit trail against ${ticket.queryNo}.`] : []),
      ...(willResolve ? ['', `The record is corrected and ${ticket.queryNo} is resolved together — if either fails, neither happens.`] : []),
    ].join('\n');
    Alert.alert(willResolve ? `Apply changes to ${ticket.referenceNo} and resolve the query?` : `Apply these changes to ${ticket.referenceNo}?`, summary, [
      { text: 'Cancel', style: 'cancel' },
      { text: willResolve ? 'Apply & Resolve' : 'Apply changes', onPress: apply },
    ]);
  };

  if (recordDeleted) {
    return (
      <View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{ticket.referenceNo} has been deleted, so there is nothing left to correct.</Text>
        <SheetButtons busy={false} label="Close" onCancel={onClose} onSave={onClose} />
      </View>
    );
  }

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {FIN_REFERENCE_LABEL[referenceType]} {ticket.referenceNo}
        {live?.branchName ? ` — ${String(live.branchName)}` : ''}
        {live?.status ? ` · ${String(live.status).replace(/_/g, ' ')}` : ''}. Changes are written to the record itself, not to the query.
      </Text>
      {reloaded ? <Notice tone="muted">Loaded the latest version of {ticket.referenceNo}. Your earlier edits were cleared; make your correction again.</Notice> : null}
      {referenceType === 'ledger_entry' || (referenceType === 'finance_transaction' && approved) ? (
        <Hint>
          Applying changes the voucher itself: it keeps its number and no reversal is posted. Type follows the category, so only {recordType || 'same-type'}{' '}
          categories are offered.
        </Hint>
      ) : null}
      {fields.map((spec) => {
        const value = draft[spec.key] ?? '';
        const setValue = (v: string) => setDraft((p) => ({ ...p, [spec.key]: v }));
        const change = changes.find((c) => c.spec.key === spec.key);
        const bad = invalid.includes(spec.key);
        let input;
        if (spec.kind === 'money') {
          input = <NumBox label={spec.label} value={value} onChangeText={(v) => setValue(moneyChars(v))} error={bad} />;
        } else if (spec.kind === 'text') {
          input = <TextField label={spec.label} value={value} onChangeText={setValue} maxLength={500} />;
        } else if (spec.kind === 'date') {
          input = (
            <View style={{ marginTop: 16 }}>
              <DateField label={spec.label} value={value} onChange={setValue} maximumDate={today} placeholder={`Up to ${today}`} />
            </View>
          );
        } else {
          const options: DropdownOption<string>[] =
            spec.kind === 'select'
              ? [
                  ...(!(spec.options ?? []).some((o) => o.value === current[spec.key]) ? [{ value: current[spec.key] || NONE, label: current[spec.key] ? titleCase(current[spec.key]) : '—' }] : []),
                  ...(spec.options ?? []),
                ]
              : spec.kind === 'head'
                ? [
                    ...(!heads.some((h) => h.id === current[spec.key]) && current[spec.key] ? [{ value: current[spec.key], label: currentHeadName }] : []),
                    ...heads.map((h) => ({ value: h.id, label: h.name, hint: h.code })),
                  ]
                : [{ value: NONE, label: 'Company-wide' }, ...branches.map((b) => ({ value: b.id, label: b.name }))];
          input = (
            <View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: 14, marginBottom: 6 }]}>{spec.label}</Text>
              <Dropdown
                options={options}
                value={value || NONE}
                onChange={(v) => setValue(v === NONE ? '' : v)}
                loading={spec.kind === 'head' ? headsQ.isLoading : spec.kind === 'branch' ? branchesQ.isLoading : false}
              />
            </View>
          );
        }
        return (
          <View key={spec.key}>
            {input}
            {bad ? (
              <Hint tone="danger">Enter an amount of 0 or more, with at most 2 decimals.</Hint>
            ) : change ? (
              <Hint>
                Was {shown(spec, change.from)}
                {change.difference !== null ? ` (${signedMoney(change.difference)})` : ''}
              </Hint>
            ) : null}
          </View>
        );
      })}

      <View style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md, gap: 4 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase' }]}>Changes</Text>
        {changes.length === 0 ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No changes detected.</Text>
        ) : (
          changes.map((c) => (
            <Text key={c.spec.key} style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
              {c.spec.label}: {shown(c.spec, c.from)} → {shown(c.spec, c.to)}
              {c.difference !== null ? `  ${signedMoney(c.difference)}` : ''}
            </Text>
          ))
        )}
      </View>
      <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline maxLength={2000} placeholder="Reason for the change" />
      {canResolve ? (
        <ConfirmTick checked={resolve} onChange={setResolve} label={`Resolve ${ticket.queryNo} when applied`} />
      ) : (
        <Hint>
          {ticket.queryNo} is {FIN_STATUS_LABEL[ticket.status]}, so the correction is applied without changing its status.
        </Hint>
      )}
      <SheetButtons busy={correct.isPending} label={willResolve ? 'Apply & Resolve' : 'Apply changes'} onCancel={onClose} onSave={review} disabled={changes.length === 0} />
    </View>
  );
}

// ─── The sheet ──────────────────────────────────────────────────────────────

export type FinanceQuerySheet =
  | { kind: QuickFeedMode }
  | { kind: 'restore' | 'reopen' | 'assign' | 'respond' | 'deleteQuery' | 'deleteRecord' | 'correct' }
  | { kind: 'status'; target: FinanceTicketStatus };

function titleOf(sheet: FinanceQuerySheet, t: FinanceTicket): string {
  switch (sheet.kind) {
    case 'edit':
      return `Edit ${t.queryNo}`;
    case 'amend':
      return `Amend ${t.queryNo}`;
    case 'recreate':
      return `Recreate ${t.queryNo}`;
    case 'restore':
      return `Restore — ${t.queryNo}`;
    case 'reopen':
      return `Reopen — ${t.queryNo}`;
    case 'assign':
      return `Assign ${t.queryNo}`;
    case 'respond':
      return 'Admin Response';
    case 'deleteQuery':
      return 'Delete query?';
    case 'deleteRecord':
      return `Delete ${t.referenceNo}?`;
    case 'correct':
      return `Correct record — ${t.referenceNo}`;
    case 'status':
      return `${FIN_STATUS_LABEL[sheet.target]} — ${t.queryNo}`;
  }
}

/**
 * One bottom sheet for every admin action on a finance query. Each form
 * mounts only while open; on success the query refetches in place (the hooks
 * invalidate it), as the web's dialog does — except Recreate, which opens the
 * new query.
 */
export function useFinanceQuerySheet(ticket: FinanceTicket | undefined, onReload: () => Promise<unknown>, onRecreated: (id: string) => void) {
  const ref = useRef<BottomSheetModal>(null);
  const [sheet, setSheet] = useState<FinanceQuerySheet | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: FinanceQuerySheet) => {
    setSheet(next);
    ref.current?.present();
  };

  const body = (() => {
    if (!sheet || !ticket) return null;
    const props = { ticket, onClose: close };
    switch (sheet.kind) {
      case 'edit':
      case 'amend':
      case 'recreate':
        return <FeedForm {...props} mode={sheet.kind} onRecreated={onRecreated} />;
      case 'restore':
        return <RestoreForm {...props} />;
      case 'reopen':
        return <ReopenForm {...props} />;
      case 'assign':
        return <AssignForm {...props} />;
      case 'respond':
        return <RespondForm {...props} />;
      case 'deleteQuery':
        return <DeleteQueryForm {...props} />;
      case 'deleteRecord':
        return <DeleteRecordForm {...props} />;
      case 'correct':
        return <CorrectRecordForm {...props} onReload={onReload} />;
      case 'status':
        return <StatusForm {...props} target={sheet.target} />;
    }
    return null;
  })();

  const element = (
    <FormBottomSheet
      ref={ref}
      title={sheet && ticket ? titleOf(sheet, ticket) : ''}
      subtitle={ticket ? `${ticket.queryNo} · v${ticket.version}` : undefined}
      onRequestClose={close}
      onDismiss={() => setSheet(null)}>
      {body}
    </FormBottomSheet>
  );

  return { open, element };
}
