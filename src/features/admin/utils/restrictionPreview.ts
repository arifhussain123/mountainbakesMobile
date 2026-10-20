import type { RestrictionRequestStatus, RestrictionRules, RestrictionRulesState } from '@/api/types';
import { addDaysToDateStr, daysBetweenDateStr, restrictionDmy } from '../screens/settings/restrictionFormat';

/**
 * Settings → Restriction Rules → Popup Preview — the web `PreviewTab.tsx` and
 * the evaluators it renders through (`@mb/shared` `utils/restriction.ts`),
 * ported line for line. Configuration and made-up facts in, the worded notice
 * the API would produce out: the same functions the server runs, so the
 * preview reads exactly as a branch's popup would under the rules AS SAVED.
 * Pure (no React, no clock) so every scenario is unit-tested.
 */

// ─── Types (backend shared/types/restriction.types.ts) ──────────────────────

export type RestrictionCode =
  | 'DEMAND_PENDING_LIMIT'
  | 'BACKDATED_DEMAND'
  | 'LOW_SALES_AFTER_CLOSING'
  | 'HOURLY_SALES_LIMIT'
  | 'CASH_DEPOSIT_LIMIT'
  | 'LEDGER_BACKDATE'
  | 'COMPANY_SHARE_INCOME'
  | 'PRODUCTION_STOCK_SHORTAGE';

/** `warning` leaves the action available; `blocking` and `admin_approval_required` do not. */
export type RestrictionSeverity = 'info' | 'warning' | 'blocking' | 'admin_approval_required' | 'approved';

/** One restriction, already worded for the popup that will show it. */
export interface Restriction {
  code: RestrictionCode;
  severity: RestrictionSeverity;
  title: string;
  messages: string[];
  list?: string[];
  after?: string[];
  stats?: { label: string; value: string }[];
  shortages?: { productName: string; required: number; available: number; short: number }[];
  meter?: { value: number; required: number };
  reason?: string;
  threshold?: number;
  currentValue?: number;
  requiresAdminApproval: boolean;
  canRequestApproval?: boolean;
  requestId?: string;
  requestNo?: string;
  approvalNo?: string;
  requestStatus?: RestrictionRequestStatus;
}

export interface RestrictionCheck {
  allowed: boolean;
  restriction: Restriction | null;
}

/** The slice of a request the evaluators need. */
export interface RequestState {
  id: string;
  requestNo: string;
  status: RestrictionRequestStatus;
  approvalNo: string | null;
  adminReason: string | null;
}

// ─── Severity ────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<RestrictionSeverity, number> = { blocking: 4, admin_approval_required: 3, approved: 2, warning: 1, info: 0 };

export function restrictionAllows(r: Restriction | null): boolean {
  return !r || (r.severity !== 'blocking' && r.severity !== 'admin_approval_required');
}

/** The most severe restriction (first wins a tie); `allowed` over all of them. */
export function pickRestriction(list: (Restriction | null)[]): RestrictionCheck {
  const fired = list.filter((r): r is Restriction => r !== null);
  let top: Restriction | null = null;
  for (const r of fired) {
    if (!top || SEVERITY_RANK[r.severity] > SEVERITY_RANK[top.severity]) top = r;
  }
  return { allowed: fired.every(restrictionAllows), restriction: top };
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// ─── Approval-gated rules share one shape ────────────────────────────────────

interface ApprovalCopy {
  code: RestrictionCode;
  required: { title: string; messages: string[] };
  rejected: { title: string; messages: string[] };
  approved: { messages: string[] };
  closed: { title: string; messages: string[] };
  stats?: Restriction['stats'];
  threshold?: number;
  currentValue?: number;
}

function approvalGated(copy: ApprovalCopy, approvalsOpen: boolean, request: RequestState | null): Restriction {
  const base = { code: copy.code, stats: copy.stats, threshold: copy.threshold, currentValue: copy.currentValue };

  if (!approvalsOpen) {
    return { ...base, severity: 'blocking', title: copy.closed.title, messages: copy.closed.messages, requiresAdminApproval: false };
  }
  if (request?.status === 'approved') {
    return {
      ...base,
      severity: 'approved',
      title: 'Admin Approved ✓',
      messages: copy.approved.messages,
      stats: [
        { label: 'Approval', value: request.approvalNo ?? '—' },
        { label: 'Request', value: request.requestNo },
      ],
      requiresAdminApproval: false,
      requestId: request.id,
      requestNo: request.requestNo,
      approvalNo: request.approvalNo ?? undefined,
      requestStatus: 'approved',
    };
  }
  if (request?.status === 'rejected') {
    return {
      ...base,
      severity: 'blocking',
      title: copy.rejected.title,
      messages: copy.rejected.messages,
      reason: request.adminReason ?? undefined,
      requiresAdminApproval: true,
      canRequestApproval: true,
      requestId: request.id,
      requestNo: request.requestNo,
      approvalNo: request.approvalNo ?? undefined,
      requestStatus: 'rejected',
    };
  }
  if (request?.status === 'pending') {
    return {
      ...base,
      severity: 'admin_approval_required',
      title: 'Waiting for Admin Approval',
      messages: [`Request ${request.requestNo} has been sent to Admin.`, 'This cannot continue until Admin approves it.'],
      requiresAdminApproval: true,
      canRequestApproval: false,
      requestId: request.id,
      requestNo: request.requestNo,
      requestStatus: 'pending',
    };
  }
  return { ...base, severity: 'admin_approval_required', title: copy.required.title, messages: copy.required.messages, requiresAdminApproval: true, canRequestApproval: true };
}

// ─── Evaluators ──────────────────────────────────────────────────────────────

export function evalPendingDemand(cfg: RestrictionRules['demand']['pendingLimit'], pendingNumbers: string[]): Restriction | null {
  if (!cfg.enabled) return null;
  const count = pendingNumbers.length;
  const list = pendingNumbers.map((n) => `#${n}`);
  if (count >= cfg.blockAt) {
    return {
      code: 'DEMAND_PENDING_LIMIT',
      severity: 'blocking',
      title: 'New Demand Not Authorized',
      messages: [plural(count, 'Your demand number:', 'Your demand numbers:')],
      list,
      after: [
        plural(count, 'is still awaiting verification.', 'are still awaiting verification.'),
        'You cannot forward a new demand until the pending demands are verified.',
        'Please contact the Admin to resolve this issue.',
      ],
      threshold: cfg.blockAt,
      currentValue: count,
      requiresAdminApproval: false,
    };
  }
  if (count >= cfg.warnAt && count > 0) {
    return {
      code: 'DEMAND_PENDING_LIMIT',
      severity: 'warning',
      title: 'Warning',
      messages: [
        `You currently have ${count} ${plural(count, 'demand', 'demands')} awaiting verification.`,
        'Please wait for verification before submitting additional demands.',
        'Pending Demand Numbers:',
      ],
      list,
      threshold: cfg.blockAt,
      currentValue: count,
      requiresAdminApproval: false,
    };
  }
  return null;
}

export function evalBackdatedDemand(
  cfg: RestrictionRules['demand']['backdated'],
  input: { backdatedDate: string | null; today: string; request: RequestState | null },
): Restriction | null {
  if (!cfg.enabled || !input.backdatedDate) return null;
  return approvalGated(
    {
      code: 'BACKDATED_DEMAND',
      required: {
        title: 'Backdated Demand',
        messages: ['This demand uses a previous business date.', 'Admin approval is required before this demand can be forwarded.'],
      },
      rejected: { title: 'Backdated Demand Rejected', messages: ['This demand was not approved by Admin.'] },
      approved: { messages: ['Backdated demand is authorized.'] },
      closed: {
        title: 'Backdated Demand',
        messages: ['This demand uses a previous business date.', 'Backdated demands are not allowed. Please contact Admin.'],
      },
      stats: [
        { label: 'Requested', value: restrictionDmy(input.backdatedDate) },
        { label: 'Current', value: restrictionDmy(input.today) },
      ],
    },
    cfg.requireApproval,
    input.request,
  );
}

export function evalLowSales(
  cfg: RestrictionRules['demand']['lowSales'],
  input: { afterClosing: boolean; applicableQty: number; soldQty: number },
): Restriction | null {
  if (!cfg.enabled || !input.afterClosing || input.applicableQty <= 0) return null;
  // One decimal, rounded DOWN: 29.96% must not display as 30.0% and still block.
  const pct = Math.floor((input.soldQty / input.applicableQty) * 1000) / 10;
  if (pct >= cfg.minSoldPercent) return null;
  const remaining = Math.max(input.applicableQty - input.soldQty, 0);
  return {
    code: 'LOW_SALES_AFTER_CLOSING',
    severity: 'blocking',
    title: 'Demand Forwarding Restricted',
    messages: [
      'Your current stock is still standing.',
      `Only ${pct}% of the applicable stock has been sold.`,
      `Minimum required sold percentage: ${cfg.minSoldPercent}%`,
      'Please sell the available stock before forwarding a new demand.',
    ],
    meter: { value: Math.min(pct, 100), required: cfg.minSoldPercent },
    stats: [
      { label: 'Applicable Stock', value: String(input.applicableQty) },
      { label: 'Sold', value: String(input.soldQty) },
      { label: 'Remaining', value: String(remaining) },
      { label: 'Sold Percentage', value: `${pct}%` },
      { label: 'Required', value: `${cfg.minSoldPercent}%` },
    ],
    threshold: cfg.minSoldPercent,
    currentValue: pct,
    requiresAdminApproval: false,
  };
}

export function evalHourlySales(cfg: RestrictionRules['sales']['hourly'], input: { count: number; hourLabel: string }): Restriction | null {
  if (!cfg.enabled || input.count >= cfg.threshold) return null;
  return {
    code: 'HOURLY_SALES_LIMIT',
    severity: 'warning',
    title: 'Sales Activity Warning',
    messages: [
      input.count === 0
        ? 'Your branch has not recorded any sale during the current hourly period.'
        : `Your branch has recorded only ${input.count} ${plural(input.count, 'sale', 'sales')} during the current hourly period.`,
      'Please continue normal sales activity.',
    ],
    stats: [
      { label: 'Business hour', value: input.hourLabel },
      { label: 'Sales this hour', value: `${input.count} / ${cfg.threshold}` },
    ],
    threshold: cfg.threshold,
    currentValue: input.count,
    requiresAdminApproval: false,
  };
}

export function evalProductionShortage(shortfalls: { productName: string; requested: number; available: number; shortage: number }[]): Restriction | null {
  if (shortfalls.length === 0) return null;
  return {
    code: 'PRODUCTION_STOCK_SHORTAGE',
    severity: 'blocking',
    title: 'Production Stock Shortage',
    messages: ['Production stock is less than demand stock.'],
    shortages: shortfalls.map((s) => ({ productName: s.productName, required: s.requested, available: s.available, short: s.shortage })),
    after: ['Please add new stock for the required products.', 'After adding the new stock, contact the Admin for approval of this demand.'],
    requiresAdminApproval: false,
  };
}

export function evalCashLimit(
  cfg: RestrictionRules['cash']['dailyLimit'],
  input: { transferNos: string[]; businessDate: string; today: string; request: RequestState | null },
): Restriction | null {
  const count = input.transferNos.length;
  if (!cfg.enabled || count < cfg.limit) return null;

  const day = input.businessDate === input.today ? 'today' : restrictionDmy(input.businessDate);
  const forwarded = {
    messages: [
      `Your ${cfg.limit} allowed cash-deposit ${plural(cfg.limit, 'transaction', 'transactions')} for ${day} ${plural(cfg.limit, 'has', 'have')} already been forwarded.`,
      plural(count, 'Your CT-Number:', 'Your CT-Numbers:'),
    ],
    list: input.transferNos,
  };
  const base = { code: 'CASH_DEPOSIT_LIMIT' as const, threshold: cfg.limit, currentValue: count };

  if (cfg.allowExceptions && input.request?.status === 'approved') {
    return {
      ...base,
      severity: 'approved',
      title: 'Admin Approved ✓',
      messages: ['One additional cash deposit is authorized.'],
      stats: [
        { label: 'Approval', value: input.request.approvalNo ?? '—' },
        { label: 'Request', value: input.request.requestNo },
      ],
      requiresAdminApproval: false,
      requestId: input.request.id,
      requestNo: input.request.requestNo,
      approvalNo: input.request.approvalNo ?? undefined,
      requestStatus: 'approved',
    };
  }

  const pending = cfg.allowExceptions && input.request?.status === 'pending';
  const rejected = cfg.allowExceptions && input.request?.status === 'rejected';
  return {
    ...base,
    ...forwarded,
    severity: 'blocking',
    title: 'Cash Deposit Limit Reached',
    after: [
      plural(count, 'has been forwarded.', 'have been forwarded.'),
      pending
        ? `Request ${input.request!.requestNo} for one more deposit is waiting for Admin.`
        : rejected
          ? 'Admin did not approve an additional deposit.'
          : 'For additional cash-deposit transactions, please contact Admin.',
    ],
    reason: rejected ? (input.request!.adminReason ?? undefined) : undefined,
    requiresAdminApproval: cfg.allowExceptions,
    canRequestApproval: cfg.allowExceptions && !pending,
    requestId: input.request?.id,
    requestNo: input.request?.requestNo,
    requestStatus: cfg.allowExceptions ? input.request?.status : undefined,
  };
}

export function evalLedgerBackdate(
  cfg: RestrictionRules['ledger']['backdate'],
  input: { entryDate: string; today: string; request: RequestState | null },
): Restriction | null {
  if (!cfg.enabled) return null;
  const daysBack = daysBetweenDateStr(input.entryDate, input.today);
  if (daysBack <= cfg.allowedDays) return null;
  return approvalGated(
    {
      code: 'LEDGER_BACKDATE',
      required: {
        title: 'Backdated Ledger Entry',
        messages: [`This entry is older than the allowed ${cfg.allowedDays}-day back-entry period.`, 'Admin approval is required.'],
      },
      rejected: { title: 'Ledger Entry Rejected', messages: ['Admin did not approve this backdated entry.'] },
      approved: { messages: ['Backdated ledger entry is authorized.'] },
      closed: { title: 'Backdated Ledger Entry', messages: ['This entry is older than the allowed back-entry period.'] },
      stats: [
        { label: 'Entry date', value: restrictionDmy(input.entryDate) },
        { label: 'Business date', value: restrictionDmy(input.today) },
        { label: 'Allowed from', value: restrictionDmy(addDaysToDateStr(input.today, -cfg.allowedDays)) },
        { label: 'Days back', value: String(daysBack) },
      ],
      threshold: cfg.allowedDays,
      currentValue: daysBack,
    },
    true,
    input.request,
  );
}

export function evalCompanyShare(cfg: RestrictionRules['company']['shareIncome'], input: { isCompanyShare: boolean; request: RequestState | null }): Restriction | null {
  if (!cfg.enabled || !input.isCompanyShare) return null;
  const why = ['Company Share cannot be entered directly as normal income.', 'Company Share is received through Branch Cash Deposit.'];
  return approvalGated(
    {
      code: 'COMPANY_SHARE_INCOME',
      required: { title: 'Company Share Requires Admin Approval', messages: [...why, 'Admin approval is required for this Income entry.'] },
      rejected: { title: 'Company Share Income Rejected', messages: ['Admin did not authorize this company-share income entry.'] },
      approved: { messages: ['Company Share income entry is authorized.'] },
      closed: { title: 'Company Share Cannot Be Entered as Income', messages: why },
    },
    cfg.allowApproval,
    input.request,
  );
}

/** The web's `ConnectionRequiredNotice`: shown in place of a restriction when the server could not be asked. */
export const CONNECTION_REQUIRED_NOTICE: Restriction = {
  code: 'DEMAND_PENDING_LIMIT',
  severity: 'info',
  title: 'Verification Required',
  messages: ['This action requires an online server verification before it can be submitted.', 'Please reconnect to the internet and try again.'],
  requiresAdminApproval: false,
};

// ─── The 16 scenarios (web PreviewTab) ───────────────────────────────────────

const SAMPLE: Record<RestrictionRequestStatus, RequestState> = {
  pending: { id: 'sample', requestNo: 'REQ-000141', status: 'pending', approvalNo: null, adminReason: null },
  approved: { id: 'sample', requestNo: 'REQ-000141', status: 'approved', approvalNo: 'APR-000421', adminReason: null },
  rejected: { id: 'sample', requestNo: 'REQ-000137', status: 'rejected', approvalNo: 'APR-000414', adminReason: 'Already fulfilled from an earlier demand.' },
};

export interface PreviewScenario {
  key: string;
  popup: 'New Demand' | 'New Sale' | 'Cash Deposit' | 'Ledger Entry' | 'Income' | 'Production Demand';
  label: string;
  endpoint: string;
  submit: string;
  fields: (today: string) => [string, string][];
  /** null → the rule is switched off (or does not fire at these thresholds). */
  build: (s: RestrictionRulesState) => Restriction | null | 'offline';
}

const dmds = (n: number) => Array.from({ length: n }, (_, i) => `DMD-00220${i + 1}`);
const back = (s: RestrictionRulesState, days: number) => addDaysToDateStr(s.businessDate, -days);

export const PREVIEW_SCENARIOS: PreviewScenario[] = [
  {
    key: 'demandWarn', popup: 'New Demand', label: 'Pending demands · warning', endpoint: '/api/production-orders', submit: 'Submit Order',
    fields: (t) => [['Branch', 'Gulberg'], ['Required date', t]],
    build: (s) => evalPendingDemand(s.rules.demand.pendingLimit, dmds(Math.max(s.rules.demand.pendingLimit.warnAt, 1))),
  },
  {
    key: 'demandBlock', popup: 'New Demand', label: 'Pending demands · blocked', endpoint: '/api/production-orders', submit: 'Submit Order',
    fields: (t) => [['Branch', 'Gulberg'], ['Required date', t]],
    build: (s) => evalPendingDemand(s.rules.demand.pendingLimit, dmds(s.rules.demand.pendingLimit.blockAt)),
  },
  ...(['none', 'pending', 'rejected', 'approved'] as const).map(
    (st): PreviewScenario => ({
      key: `bd-${st}`, popup: 'New Demand', endpoint: '/api/production-orders', submit: 'Submit Order',
      label: `Backdated · ${st === 'none' ? 'approval required' : st === 'pending' ? 'waiting for Admin' : st}`,
      fields: () => [['Branch', 'Gulberg'], ['Required date', '2 days ago']],
      build: (s) =>
        evalBackdatedDemand(s.rules.demand.backdated, { backdatedDate: back(s, 2), today: s.businessDate, request: st === 'none' ? null : SAMPLE[st] }),
    }),
  ),
  {
    key: 'lowSales', popup: 'New Demand', label: 'Low sales after closing', endpoint: '/api/production-orders', submit: 'Submit Order',
    fields: (t) => [['Branch', 'Bahria Town'], ['Required date', t]],
    build: (s) => {
      // A sample day that sold a little under three quarters of the minimum.
      const sold = Math.max(Math.floor(420 * s.rules.demand.lowSales.minSoldPercent * 0.0073), 0);
      return evalLowSales(s.rules.demand.lowSales, { afterClosing: true, applicableQty: 420, soldQty: sold });
    },
  },
  {
    key: 'salesNone', popup: 'New Sale', label: 'Hourly sales · none this hour', endpoint: '/api/restrictions/check/sale', submit: 'Save Sale',
    fields: () => [['Product', 'Chicken Patties ×6'], ['Total', 'Rs. 1,080']],
    build: (s) => evalHourlySales(s.rules.sales.hourly, { count: 0, hourLabel: '10:00–11:00' }),
  },
  {
    key: 'salesLow', popup: 'New Sale', label: 'Hourly sales · below required', endpoint: '/api/restrictions/check/sale', submit: 'Save Sale',
    fields: () => [['Product', 'Chicken Patties ×6'], ['Total', 'Rs. 1,080']],
    build: (s) => evalHourlySales(s.rules.sales.hourly, { count: Math.max(s.rules.sales.hourly.threshold - 1, 0), hourLabel: '10:00–11:00' }),
  },
  {
    key: 'production', popup: 'Production Demand', label: 'Stock shortage', endpoint: '/api/production-orders/:id/review', submit: 'Submit for Verification',
    fields: () => [['Branch', 'Gulberg'], ['Demand', 'DMD-002226']],
    build: (s) =>
      s.rules.production.stockShortage.enabled
        ? evalProductionShortage([
            { productName: 'Cream Puff', requested: 100, available: 70, shortage: 30 },
            { productName: 'Chocolate Balls', requested: 40, available: 25, shortage: 15 },
          ])
        : null,
  },
  {
    key: 'cash', popup: 'Cash Deposit', label: 'Daily limit reached', endpoint: '/api/cash-transfers', submit: 'Save',
    fields: () => [['Branch', 'DHA Phase 5'], ['Amount', 'Rs. 42,000']],
    build: (s) =>
      evalCashLimit(s.rules.cash.dailyLimit, {
        transferNos: Array.from({ length: s.rules.cash.dailyLimit.limit }, (_, i) => `CT-00017${i + 1}`),
        businessDate: s.businessDate,
        today: s.businessDate,
        request: null,
      }),
  },
  ...(['none', 'rejected'] as const).map(
    (st): PreviewScenario => ({
      key: `ledger-${st}`, popup: 'Ledger Entry', endpoint: '/api/finance/income/entries', submit: 'Submit for approval',
      label: `Backdated · ${st === 'none' ? 'approval required' : 'rejected'}`,
      fields: (t) => [['Type', 'Expense · Utilities'], ['Entry date', `${t} − 4 days over the limit`]],
      build: (s) =>
        evalLedgerBackdate(s.rules.ledger.backdate, {
          entryDate: back(s, s.rules.ledger.backdate.allowedDays + 4),
          today: s.businessDate,
          request: st === 'none' ? null : { ...SAMPLE.rejected, adminReason: 'No receipt attached. Resubmit with the vendor invoice.' },
        }),
    }),
  ),
  ...(['none', 'approved'] as const).map(
    (st): PreviewScenario => ({
      key: `co-${st}`, popup: 'Income', endpoint: '/api/finance/income/entries', submit: 'Submit for approval',
      label: `Company Share · ${st === 'none' ? 'approval required' : 'approved'}`,
      fields: () => [['Category', 'Company Share'], ['Amount', 'Rs. 125,000']],
      build: (s) => evalCompanyShare(s.rules.company.shareIncome, { isCompanyShare: true, request: st === 'none' ? null : SAMPLE.approved }),
    }),
  ),
  {
    key: 'offline', popup: 'New Demand', label: 'Offline · verification required', endpoint: '/api/production-orders', submit: 'Submit Order',
    fields: (t) => [['Branch', 'Gulberg'], ['Required date', t]],
    build: () => 'offline',
  },
];

export const DEFAULT_PREVIEW_SCENARIO = 'demandBlock';

export interface PreviewModel {
  scenario: PreviewScenario;
  offline: boolean;
  /** The notice the popup draws — null when the rule is off or does not fire. */
  restriction: Restriction | null;
  check: RestrictionCheck;
  fields: [string, string][];
  /** The "Server response" panel: the check as JSON, or the offline comment. */
  json: string;
  /** "· 409, in details" is appended to the endpoint when the server would refuse. */
  endpointLabel: string;
  submitDisabled: boolean;
}

/** Everything the Preview tab renders for one scenario under the saved rules — the web component's body. */
export function buildPreview(key: string, state: RestrictionRulesState): PreviewModel {
  const scenario = PREVIEW_SCENARIOS.find((s) => s.key === key) ?? PREVIEW_SCENARIOS[0]!;
  const built = scenario.build(state);
  const offline = built === 'offline';
  const restriction = offline ? null : built;
  const check = pickRestriction([restriction]);
  const json = offline
    ? '// No response — the request is not sent.\n// The device is offline; cached restriction data is not used.'
    : JSON.stringify(check, null, 2);
  return {
    scenario,
    offline,
    restriction,
    check,
    fields: scenario.fields(restrictionDmy(state.businessDate)),
    json,
    endpointLabel: `Server response · ${scenario.endpoint}${!offline && !check.allowed ? ' · 409, in details' : ''}`,
    submitDisabled: offline || !check.allowed,
  };
}
