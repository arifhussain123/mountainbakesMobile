import type {
  FinanceQueryPriority,
  FinanceQueryType,
  FinanceTicket,
  FinanceTicketReferenceType,
  FinanceTicketStats,
  FinanceTicketStatus,
  SupportReferenceType,
  SupportTicket,
  SupportTicketStatus,
} from '@/api';
import type { StatusVariant } from '@/shared/ui';
import { formatDisplayTime } from '@/shared/utils';

/**
 * Web `SupportCenterPage` + `FinanceHelpDeskPage` + `help-desk-ui` vocabulary,
 * copied so the Super Admin Support Center reads exactly as the web does. Kept
 * local rather than changing the shared mobile labels other roles already use.
 */

export type SupportSource = 'all' | 'finance' | 'branch' | 'production';

export const SOURCE_LABELS: Record<SupportSource, string> = {
  all: 'All',
  finance: 'Finance',
  branch: 'Branch',
  production: 'Production',
};

export const SOURCES: readonly SupportSource[] = ['all', 'finance', 'branch', 'production'];

/** BRANCH blue, PRODUCTION amber, FINANCE violet — the web's source badge colours. */
export const SOURCE_VARIANT: Record<Exclude<SupportSource, 'all'>, StatusVariant> = {
  finance: 'violet',
  branch: 'info',
  production: 'warning',
};

/** Web `sourceOfTicket` — from the raiser's role; a 'system' ticket has no source. */
export function sourceOfTicket(ticket: SupportTicket): Exclude<SupportSource, 'all'> | null {
  const role = ticket.raisedByRole;
  if (role === 'branch_manager') return 'branch';
  if (role === 'production_user') return 'production';
  return null;
}

export const TYPE_LABEL: Record<SupportReferenceType, string> = {
  sale: 'Sale',
  demand: 'Demand',
  expense: 'Expense',
  stock: 'Stock',
  cash_transfer: 'Cash Deposit',
  system: 'System',
};

export const OPS_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Open',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

/** Web: open = default, resolved = secondary (grey), rejected = destructive. */
export const OPS_STATUS_VARIANT: Record<SupportTicketStatus, StatusVariant> = {
  open: 'info',
  resolved: 'neutral',
  rejected: 'danger',
};

/** The role line under "From" — web prints `raisedByRole` with the underscore spaced, capitalised. */
export function roleLine(role: string | null | undefined): string {
  if (!role) return '';
  const spaced = role.replace(/_/g, ' ');
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Finance queries ────────────────────────────────────────────────────────

export const FINANCE_STATUS_ORDER: readonly FinanceTicketStatus[] = [
  'open',
  'under_review',
  'waiting_for_finance',
  'amended',
  'reopened',
  'resolved',
  'rejected',
  'closed',
];

export const FIN_STATUS_LABEL: Record<FinanceTicketStatus, string> = {
  draft: 'Draft',
  open: 'Pending',
  under_review: 'In Review',
  waiting_for_finance: 'Waiting for Finance',
  amended: 'Amended',
  reopened: 'Reopened',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
};

/** Web colour vocabulary: blue raised, amber worked, violet back with Finance, emerald dealt with, red refused, slate filed. */
export const FIN_STATUS_VARIANT: Record<FinanceTicketStatus, StatusVariant> = {
  draft: 'neutral',
  open: 'info',
  under_review: 'warning',
  waiting_for_finance: 'violet',
  amended: 'info',
  reopened: 'danger',
  resolved: 'success',
  rejected: 'danger',
  closed: 'neutral',
};

export const FIN_QUERY_TYPES: readonly FinanceQueryType[] = [
  'income',
  'expense',
  'company_transaction',
  'partner_advance',
  'company_share',
  'branch_share',
  'salary',
  'ledger',
  'payment',
  'stock_finance_difference',
  'other',
  'calculation_issue',
];

export const FIN_QUERY_TYPE_LABEL: Record<FinanceQueryType, string> = {
  income: 'Income',
  expense: 'Expense',
  company_transaction: 'Company Transaction',
  partner_advance: 'Partner Advance',
  company_share: 'Company Share',
  branch_share: 'Branch Share',
  salary: 'Salary',
  ledger: 'Ledger',
  payment: 'Payment',
  stock_finance_difference: 'Stock / Finance Related',
  calculation_issue: 'Calculation Issue',
  other: 'Other',
};

export const FIN_PRIORITIES: readonly FinanceQueryPriority[] = ['low', 'normal', 'high', 'urgent'];

export const FIN_PRIORITY_LABEL: Record<FinanceQueryPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

/** Urgent is the only one that shouts; Low is muted. */
export const FIN_PRIORITY_VARIANT: Record<FinanceQueryPriority, StatusVariant> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
};

export const FIN_REFERENCE_LABEL: Record<FinanceTicketReferenceType, string> = {
  ledger_entry: 'Ledger Voucher',
  income_approval: 'Branch Income',
  finance_transaction: 'Transaction',
  salary_payment: 'Salary Payment',
  employee_advance: 'Employee Advance',
  partner_expense: 'Partner Expense',
  branch_share_payment: 'Branch Share',
  order: 'Sale',
  cash_transfer: 'Cash Transfer',
};

/** The reference cell's handle — web: referenceNo ?? transactionRef ?? expenseRef ?? incomeRef ?? voucherRef. */
export function financeRef(t: FinanceTicket): string | null {
  return t.referenceNo ?? t.transactionRef ?? t.expenseRef ?? t.incomeRef ?? t.voucherRef ?? null;
}

/** Badge count on the Finance source button: everything still outstanding. */
export function financeOpenCount(s: Partial<FinanceTicketStats> | undefined): number {
  if (!s) return 0;
  return (s.open ?? 0) + (s.underReview ?? 0) + (s.waiting ?? 0) + (s.amended ?? 0) + (s.reopened ?? 0);
}

/** The twelve admin cards shown when Source = Finance (web `DashboardCards`, admin side). */
export const FINANCE_STAT_CARDS: { label: string; key: keyof FinanceTicketStats; tone?: 'danger' | 'success' | 'warning' }[] = [
  { label: 'Pending', key: 'open' },
  { label: 'In Review', key: 'underReview', tone: 'warning' },
  { label: 'High Priority', key: 'highPriority', tone: 'danger' },
  { label: 'Waiting for Finance', key: 'waiting' },
  { label: 'Resolved', key: 'resolved', tone: 'success' },
  { label: 'Amended', key: 'amended' },
  { label: 'Reopened', key: 'reopened', tone: 'danger' },
  { label: 'All Queries', key: 'total' },
  { label: 'Unassigned', key: 'unassigned', tone: 'warning' },
  { label: 'Urgent', key: 'urgent', tone: 'danger' },
  { label: 'Recently Updated', key: 'recent', tone: 'success' },
  { label: 'Deleted', key: 'deleted' },
];

/** Web `formatQueryDate` — a timestamp as the app's own date ("12 Oct 2026"), optionally with the time. */
export function formatQueryDate(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return withTime ? `${date}, ${formatDisplayTime(iso)}` : date;
}

/** Web `RecordFigures`'s filter: no ids, no bookkeeping stamps, no nested objects, first 18. */
const NOISE_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'deletedBy', 'deletedQueryId']);

export function recordRows(record: Record<string, unknown> | null | undefined): [string, string][] {
  if (!record) return [];
  return Object.entries(record)
    .filter(([k, v]) => !k.endsWith('Id') && !NOISE_KEYS.has(k) && v !== null && v !== '' && typeof v !== 'object')
    .slice(0, 18)
    .map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), String(v)]);
}

/** "1 query" / "3 queries". */
export function queries(n: number): string {
  return `${n} quer${n === 1 ? 'y' : 'ies'}`;
}
