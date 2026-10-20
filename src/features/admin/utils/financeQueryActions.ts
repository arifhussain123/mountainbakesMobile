import type {
  CorrectFinanceRecordInput,
  FinancePaymentMethod,
  FinanceQueryPriority,
  FinanceQueryType,
  FinanceResolutionType,
  FinanceTicket,
  FinanceTicketReferenceType,
  FinanceTicketStatus,
  FinanceTicketStatusInput,
} from '@/api';

/**
 * Pure rules behind the Super Admin's Finance Query actions — the web
 * `FinanceHelpDeskPage` row actions, `FinanceQueryDetail` (QuickFeed, Status,
 * Assign, Delete, Reopen, Response, Conversation) and the `ChangeFiguresDialog`
 * record correction, reproduced exactly. The shared vocabulary
 * (`FINANCE_TICKET_TRANSITIONS`, `FINANCE_AMENDABLE_FIELDS`, …) is copied from
 * `@mb/shared`; the API re-decides every request (`requireFinanceHelpDeskAdmin`).
 */

// ─── Status machine ─────────────────────────────────────────────────────────

export const FINANCE_TICKET_TRANSITIONS: Record<FinanceTicketStatus, readonly FinanceTicketStatus[]> = {
  draft: [],
  open: ['under_review', 'resolved', 'rejected'],
  under_review: ['waiting_for_finance', 'resolved', 'rejected'],
  waiting_for_finance: ['under_review', 'resolved', 'rejected'],
  amended: ['under_review', 'waiting_for_finance', 'resolved', 'rejected'],
  reopened: ['under_review', 'waiting_for_finance', 'resolved', 'rejected'],
  resolved: ['closed'],
  rejected: ['closed'],
  closed: [],
};

export const FINANCE_TICKET_REOPENABLE_STATUSES: readonly FinanceTicketStatus[] = ['resolved', 'rejected', 'closed'];

export function isFinanceTicketTerminal(status: FinanceTicketStatus): boolean {
  return status === 'resolved' || status === 'rejected' || status === 'closed';
}

export const FINANCE_RESOLUTION_TYPES: readonly FinanceResolutionType[] = ['fixed', 'information_provided', 'rejected', 'duplicate', 'other'];

export const FINANCE_RESOLUTION_TYPE_LABELS: Record<FinanceResolutionType, string> = {
  fixed: 'Fixed',
  information_provided: 'Information Provided',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
  other: 'Other',
};

// ─── The record behind a query ──────────────────────────────────────────────

export interface FinanceAmendableField {
  key: string;
  label: string;
  /** 'date' is YYYY-MM-DD; 'head' a ledger head of the record's own type; 'branch' a branch id or blank (company-wide). */
  kind: 'money' | 'text' | 'select' | 'date' | 'head' | 'branch';
  movesLedger: boolean;
  options?: readonly { value: string; label: string }[];
}

const PAYMENT_METHODS: readonly FinancePaymentMethod[] = ['cash', 'easypaisa', 'bank_transfer', 'cheque', 'foodpanda', 'online', 'other'];
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  foodpanda: 'Foodpanda',
  online: 'Online',
  other: 'Other',
};
const PAYMENT_OPTIONS = PAYMENT_METHODS.map((m) => ({ value: m as string, label: PAYMENT_METHOD_LABELS[m] ?? m }));
const ACCOUNT_OPTIONS = [
  { value: 'cash', label: 'Cash in Hand' },
  { value: 'bank', label: 'Bank' },
];

/** Mirror of `amend_finance_record`'s whitelist — nothing is offered that the database would refuse. */
export const FINANCE_AMENDABLE_FIELDS: Record<FinanceTicketReferenceType, FinanceAmendableField[]> = {
  ledger_entry: [
    { key: 'amount', label: 'Amount', kind: 'money', movesLedger: true },
    { key: 'entryDate', label: 'Entry date', kind: 'date', movesLedger: true },
    { key: 'ledgerHeadId', label: 'Category', kind: 'head', movesLedger: true },
    { key: 'branchId', label: 'Branch', kind: 'branch', movesLedger: true },
    { key: 'paymentMethod', label: 'Payment method', kind: 'select', movesLedger: true, options: PAYMENT_OPTIONS },
    { key: 'account', label: 'Account', kind: 'select', movesLedger: true, options: ACCOUNT_OPTIONS },
    { key: 'description', label: 'Description', kind: 'text', movesLedger: true },
  ],
  finance_transaction: [
    { key: 'amount', label: 'Amount', kind: 'money', movesLedger: true },
    { key: 'businessDate', label: 'Business date', kind: 'date', movesLedger: true },
    { key: 'ledgerHeadId', label: 'Category', kind: 'head', movesLedger: true },
    { key: 'branchId', label: 'Branch', kind: 'branch', movesLedger: true },
    { key: 'paymentMethod', label: 'Payment method', kind: 'select', movesLedger: true, options: PAYMENT_OPTIONS },
    { key: 'account', label: 'Account', kind: 'select', movesLedger: true, options: ACCOUNT_OPTIONS },
    { key: 'description', label: 'Description', kind: 'text', movesLedger: true },
  ],
  salary_payment: [
    { key: 'grossSalary', label: 'Gross Salary', kind: 'money', movesLedger: true },
    { key: 'bonus', label: 'Bonus', kind: 'money', movesLedger: true },
    { key: 'deductions', label: 'Deductions', kind: 'money', movesLedger: true },
  ],
  employee_advance: [
    { key: 'advanceAmount', label: 'Advance', kind: 'money', movesLedger: true },
    { key: 'bonusAmount', label: 'Bonus', kind: 'money', movesLedger: true },
    { key: 'loanAmount', label: 'Loan', kind: 'money', movesLedger: true },
  ],
  partner_expense: [
    { key: 'amount', label: 'Amount', kind: 'money', movesLedger: true },
    { key: 'description', label: 'Description', kind: 'text', movesLedger: false },
  ],
  branch_share_payment: [
    { key: 'amount', label: 'Share Amount', kind: 'money', movesLedger: true },
    { key: 'bonus', label: 'Bonus', kind: 'money', movesLedger: true },
  ],
  income_approval: [
    { key: 'totalAmount', label: 'Total Income', kind: 'money', movesLedger: false },
    { key: 'branchExpenses', label: 'Branch Expenses', kind: 'money', movesLedger: false },
  ],
  // A sale is corrected in the Support Center's sale editor, never from here.
  order: [],
  cash_transfer: [
    { key: 'cashAmount', label: 'Cash', kind: 'money', movesLedger: true },
    { key: 'easypaisaAmount', label: 'Easypaisa', kind: 'money', movesLedger: true },
    { key: 'bankAmount', label: 'Bank', kind: 'money', movesLedger: true },
    { key: 'fuelCharges', label: 'Fuel Charges', kind: 'money', movesLedger: true },
    { key: 'note', label: 'Deposit note', kind: 'text', movesLedger: false },
  ],
};

export function isFinanceRecordAmendable(referenceType: FinanceTicketReferenceType | null | undefined): boolean {
  if (!referenceType) return false;
  return (FINANCE_AMENDABLE_FIELDS[referenceType] ?? []).length > 0;
}

/** The value `amend_finance_record` compares against: a ledger entry's amount is whichever of debit / credit is non-zero. */
export function financeAmendableValue(referenceType: FinanceTicketReferenceType, record: Record<string, unknown> | null | undefined, field: string): string {
  if (!record) return '';
  if (referenceType === 'ledger_entry' && field === 'amount') {
    const debit = Number(record.debit ?? 0);
    const credit = Number(record.credit ?? 0);
    return String(debit > 0 ? debit : credit);
  }
  const raw = record[field];
  return raw === null || raw === undefined ? '' : String(raw);
}

// ─── Which actions a query offers ───────────────────────────────────────────

export interface FinanceQueryActions {
  /** A deleted query offers Restore and nothing else. */
  restore: boolean;
  edit: boolean;
  /** Amend is for a live query — a terminal one has to be reopened first. */
  amend: boolean;
  recreate: boolean;
  assign: boolean;
  correctRecord: boolean;
  deleteRecord: boolean;
  deleteQuery: boolean;
  reopen: boolean;
  /** Admin Response block — editable while the query is live (not deleted, not a draft). */
  respond: boolean;
  /** The conversation is closed on a closed, draft or deleted query. */
  reply: boolean;
  /** Status moves from FINANCE_TICKET_TRANSITIONS. */
  statuses: readonly FinanceTicketStatus[];
}

/** Web `QueryDetailBody` / row actions for an Admin. `recordDeleted` comes from the live record (`liveRecord.deletedAt`). */
export function financeQueryActions(t: Pick<FinanceTicket, 'status' | 'deletedAt' | 'referenceType' | 'referenceId' | 'recreatedAsId'>, recordDeleted: boolean): FinanceQueryActions {
  const deleted = Boolean(t.deletedAt);
  const draft = t.status === 'draft';
  const adminFeeds = !deleted && !draft;
  const canTouchRecord = Boolean(t.referenceType) && Boolean(t.referenceId) && isFinanceRecordAmendable(t.referenceType) && !deleted;
  const reopenable = FINANCE_TICKET_REOPENABLE_STATUSES.includes(t.status);
  return {
    restore: deleted,
    edit: adminFeeds,
    amend: adminFeeds && !isFinanceTicketTerminal(t.status),
    recreate: !deleted && !draft && !t.recreatedAsId,
    assign: adminFeeds,
    correctRecord: canTouchRecord && !recordDeleted,
    deleteRecord: canTouchRecord && !recordDeleted,
    deleteQuery: !deleted && !draft,
    reopen: reopenable && !deleted,
    respond: adminFeeds,
    reply: !(t.status === 'closed' || draft || deleted),
    statuses: deleted || draft ? [] : FINANCE_TICKET_TRANSITIONS[t.status],
  };
}

/** The status button's wording. */
export function statusActionLabel(s: FinanceTicketStatus, labels: Record<FinanceTicketStatus, string>): string {
  return s === 'resolved' ? 'Resolve' : s === 'rejected' ? 'Reject' : s === 'closed' ? 'Close query' : labels[s];
}

export function statusDescription(target: FinanceTicketStatus): string {
  if (target === 'under_review') return 'Marks the query as being investigated. The raiser sees the change.';
  if (target === 'waiting_for_finance') return 'Asks the raiser for more. Their next message puts it back under review automatically.';
  if (target === 'closed') return 'Files the query. Nothing further can be added to it.';
  return 'Your response goes back to whoever raised it. It can be reopened later, and the answer you give here is kept if it is.';
}

/** Money fields accept digits and one dot only, like the web's `replace(/[^\d.]/g, '')`. */
export function moneyChars(v: string): string {
  return v.replace(/[^\d.]/g, '');
}

const amountOrNull = (raw: string): number | null => (raw.trim() === '' ? null : Number(raw));

export interface StatusForm {
  response: string;
  note: string;
  amount: string;
  resolutionType: FinanceResolutionType;
}

export function statusFormFrom(t: Pick<FinanceTicket, 'adminResponse' | 'resolutionNote' | 'resolutionAmount'>, target: FinanceTicketStatus): StatusForm {
  return {
    response: t.adminResponse ?? '',
    note: t.resolutionNote ?? '',
    amount: t.resolutionAmount === null || t.resolutionAmount === undefined ? '' : String(t.resolutionAmount),
    resolutionType: target === 'rejected' ? 'rejected' : 'fixed',
  };
}

/**
 * Web StatusDialog's body: a terminal move carries the resolution type and
 * amount; response / note only when they changed. A terminal move needs a
 * response or a note (the web disables the button otherwise).
 */
export function statusPayload(
  t: Pick<FinanceTicket, 'adminResponse' | 'resolutionNote'>,
  target: FinanceTicketStatus,
  form: StatusForm,
): { input: FinanceTicketStatusInput } | { error: string } {
  const terminal = target === 'resolved' || target === 'rejected';
  const response = form.response.trim();
  const note = form.note.trim();
  if (terminal && !response && !note) return { error: 'Write a response or the resolution details first.' };
  const amount = amountOrNull(form.amount);
  if (terminal && amount !== null && !Number.isFinite(amount)) return { error: 'Enter the resolution amount as a number.' };
  return {
    input: {
      status: target as FinanceTicketStatusInput['status'],
      ...(terminal ? { resolutionType: form.resolutionType } : {}),
      ...(response && response !== (t.adminResponse ?? '') ? { adminResponse: response } : {}),
      ...(note && note !== (t.resolutionNote ?? '') ? { resolutionNote: note } : {}),
      ...(terminal ? { resolutionAmount: amount } : {}),
    },
  };
}

export interface ResponseForm {
  response: string;
  resolution: string;
  amount: string;
  internal: string;
}

export function responseFormFrom(t: Pick<FinanceTicket, 'adminResponse' | 'resolutionNote' | 'resolutionAmount' | 'internalNote'>): ResponseForm {
  return {
    response: t.adminResponse ?? '',
    resolution: t.resolutionNote ?? '',
    amount: t.resolutionAmount === null || t.resolutionAmount === undefined ? '' : String(t.resolutionAmount),
    internal: t.internalNote ?? '',
  };
}

/** Web ResponsePanel "Save response": only what changed; empty means nothing to save (the button stays disabled). */
export function responsePayload(t: Pick<FinanceTicket, 'adminResponse' | 'resolutionNote' | 'resolutionAmount' | 'internalNote'>, form: ResponseForm): Record<string, unknown> {
  const amount = amountOrNull(form.amount);
  return {
    ...(form.response.trim() !== (t.adminResponse ?? '') ? { adminResponse: form.response.trim() } : {}),
    ...(form.resolution.trim() !== (t.resolutionNote ?? '') ? { resolutionNote: form.resolution.trim() } : {}),
    ...(amount !== (t.resolutionAmount ?? null) ? { resolutionAmount: amount } : {}),
    ...(form.internal.trim() !== (t.internalNote ?? '') ? { internalNote: form.internal.trim() } : {}),
  };
}

/** Reasons (restore, reopen, amend, recreate, edit, delete) — the schemas' `min(3)`. */
export function reasonValid(reason: string): boolean {
  return reason.trim().length >= 3;
}

// ─── The feeding form (web QueryFeedForm) ───────────────────────────────────

export interface FeedState {
  subject: string;
  queryType: FinanceQueryType;
  priority: FinanceQueryPriority;
  description: string;
  amount: string;
  branchId: string;
  businessDate: string;
  remarks: string;
  referenceNo: string;
  voucherRef: string;
  transactionRef: string;
  expenseRef: string;
  incomeRef: string;
}

export function feedFromTicket(t: FinanceTicket): FeedState {
  return {
    subject: t.subject ?? '',
    queryType: t.queryType,
    priority: t.priority,
    description: t.message ?? '',
    amount: t.amount === null || t.amount === undefined ? '' : String(t.amount),
    branchId: t.branchId ?? '',
    businessDate: t.businessDate ?? '',
    remarks: t.remarks ?? '',
    referenceNo: t.referenceNo ?? '',
    voucherRef: t.voucherRef ?? '',
    transactionRef: t.transactionRef ?? '',
    expenseRef: t.expenseRef ?? '',
    incomeRef: t.incomeRef ?? '',
  };
}

export function feedToPayload(s: FeedState): Record<string, unknown> {
  return {
    subject: s.subject.trim(),
    queryType: s.queryType,
    priority: s.priority,
    description: s.description.trim(),
    amount: s.amount.trim() === '' ? null : Number(s.amount),
    branchId: s.branchId || null,
    businessDate: s.businessDate || null,
    remarks: s.remarks.trim() || null,
    referenceNo: s.referenceNo.trim() || null,
    voucherRef: s.voucherRef.trim() || null,
    transactionRef: s.transactionRef.trim() || null,
    expenseRef: s.expenseRef.trim() || null,
    incomeRef: s.incomeRef.trim() || null,
  };
}

/** Only the fields that moved; amount compared as a number ("15000" = "15000.00"). */
export function feedDiff(base: FeedState, next: FeedState): Record<string, unknown> {
  const full = feedToPayload(next);
  const from = feedToPayload(base);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(full)) {
    const a = from[key];
    const b = full[key];
    const same = key === 'amount' ? Number(a ?? NaN) === Number(b ?? NaN) || (a === null && b === null) : a === b;
    if (!same) out[key] = b;
  }
  return out;
}

const FEED_FIELD_LABELS: Record<string, string> = {
  subject: 'Subject',
  queryType: 'Query type',
  priority: 'Priority',
  description: 'Description',
  amount: 'Amount',
  branchId: 'Branch',
  businessDate: 'Business date',
  remarks: 'Remarks',
  referenceNo: 'Reference ID',
  voucherRef: 'Ledger / Voucher ID',
  transactionRef: 'Transaction ID',
  expenseRef: 'Expense ID',
  incomeRef: 'Income ID',
};

export function feedChangeLabels(diff: Record<string, unknown>): string[] {
  return Object.keys(diff).map((k) => FEED_FIELD_LABELS[k] ?? k);
}

/** Which free-text handles a query type calls for (web FINANCE_QUERY_TYPE_REFERENCE_FIELDS). */
export const FINANCE_QUERY_TYPE_REFERENCE_FIELDS: Partial<Record<FinanceQueryType, readonly ('transactionRef' | 'expenseRef' | 'incomeRef' | 'voucherRef')[]>> = {
  income: ['incomeRef', 'voucherRef'],
  expense: ['expenseRef', 'voucherRef'],
  company_transaction: ['transactionRef', 'voucherRef'],
  partner_advance: ['transactionRef', 'voucherRef'],
  company_share: ['transactionRef'],
  branch_share: ['transactionRef', 'incomeRef'],
  salary: ['transactionRef', 'voucherRef'],
  ledger: ['voucherRef'],
  payment: ['transactionRef', 'voucherRef'],
  stock_finance_difference: ['transactionRef'],
  calculation_issue: [],
  other: ['transactionRef', 'expenseRef', 'incomeRef', 'voucherRef'],
};

export type QuickFeedMode = 'edit' | 'amend' | 'recreate';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Web QuickFeedDialog: subject and description of 3+, a reason of 3+, and an
 * Edit must change something. The date must be YYYY-MM-DD (the web's date
 * input guarantees that; a typed one is checked here).
 */
export function quickFeedProblem(mode: QuickFeedMode, feed: FeedState, diff: Record<string, unknown>, reason: string): string | null {
  if (feed.subject.trim().length < 3 || feed.description.trim().length < 3) return 'The subject and description need at least 3 characters each.';
  if (feed.businessDate.trim() !== '' && !ISO_DATE.test(feed.businessDate.trim())) return 'Use YYYY-MM-DD for the business date.';
  if (mode === 'edit' && Object.keys(diff).length === 0) return 'Change a field above to enable Save.';
  if (!reasonValid(reason)) return 'Give a reason of at least 3 characters.';
  return null;
}

export function quickFeedSuccess(mode: QuickFeedMode, queryNo: string, resultQueryNo: string | undefined): string {
  return mode === 'edit' ? `${queryNo} updated` : mode === 'amend' ? `${queryNo} amended` : `${resultQueryNo ?? 'New query'} created from ${queryNo}`;
}

// ─── Record correction (web ChangeFiguresDialog) ────────────────────────────

const MONEY_INPUT = /^\d{1,12}(\.\d{1,2})?$/;
const paisa = (v: string) => Math.round(Number(v || 0) * 100);

export interface RecordChange {
  spec: FinanceAmendableField;
  from: string;
  to: string;
  difference: number | null;
}

/** Money fields that are not a valid amount (0 or more, at most 2 decimals). */
export function correctionInvalid(fields: FinanceAmendableField[], values: Record<string, string>): string[] {
  return fields.filter((f) => f.kind === 'money' && !MONEY_INPUT.test((values[f.key] ?? '').trim())).map((f) => f.key);
}

export function correctionChanges(fields: FinanceAmendableField[], current: Record<string, string>, values: Record<string, string>): RecordChange[] {
  return fields.flatMap((spec): RecordChange[] => {
    const from = current[spec.key] ?? '';
    const to = (values[spec.key] ?? '').trim();
    if (spec.kind === 'money') {
      if (!MONEY_INPUT.test(to) || paisa(to) === paisa(from)) return [];
      return [{ spec, from, to, difference: (paisa(to) - paisa(from)) / 100 }];
    }
    return to === from.trim() ? [] : [{ spec, from, to, difference: null }];
  });
}

/** An approved / posted / locked record is overwritten — the confirmation reaches the API as `confirmOverwrite`. */
export function isApprovedRecord(live: Record<string, unknown> | null | undefined): boolean {
  return ['approved', 'posted', 'locked'].includes(String(live?.status ?? ''));
}

export function correctionPayload(
  t: Pick<FinanceTicket, 'version'>,
  changes: RecordChange[],
  note: string,
  resolve: boolean,
  approved: boolean,
): CorrectFinanceRecordInput {
  return {
    edits: changes.map((c) => ({ field: c.spec.key, value: c.to, expected: c.from })),
    ...(note.trim() ? { note: note.trim() } : {}),
    resolve,
    expectedVersion: t.version,
    ...(approved ? { confirmOverwrite: true } : {}),
  };
}

/** Delete record / Delete query: a reason of 3+ and the confirmation box ticked. */
export function deleteConfirmed(reason: string, confirmed: boolean): boolean {
  return reasonValid(reason) && confirmed;
}

/** The `/correct-record` 409 that means "the record or the query changed since it was opened". */
export function isCorrectionConflict(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const err = e as { status?: unknown; details?: { code?: unknown } | null };
  return err.status === 409 && err.details?.code === 'conflict';
}

/**
 * Web ChangeFiguresDialog's failure wording: offline and server faults say
 * nothing was saved; anything else is the server's own sentence.
 */
export function correctionFailureMessage(e: unknown, fallback: (e: unknown) => string): string {
  const status = typeof e === 'object' && e !== null ? (e as { status?: unknown }).status : undefined;
  if (status === null) return 'Couldn’t reach the server. Check your connection — nothing was saved.';
  if (typeof status === 'number' && status >= 500) return 'Couldn’t save the correction. Nothing was changed. Try again, or contact support if it keeps happening.';
  return fallback(e);
}
