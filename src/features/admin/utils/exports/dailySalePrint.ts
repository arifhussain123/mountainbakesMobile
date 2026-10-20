import type { DailySaleRecord, DailySaleRecordDetail, DailySaleRecordStatus } from '@/api/types';
import { TEXT_COLUMNS, centerText, joinLines, kvLine, ruleLine, wrapText } from '@/shared/utils/textLayout';

/**
 * The Daily Sale Record's Print — the web's `DailySalePrintSheet` as an A4
 * text document: header (company, branch, business date, generated, status),
 * System Sales, Counted / Received, Difference, the two signature blocks and
 * the footnote. Every figure is the record's own; nothing is re-derived.
 */

const STATUS_LABEL: Record<DailySaleRecordStatus, string> = {
  open: 'Open',
  pending_verification: 'Pending Verification',
  verified: 'Verified',
  locked: 'Locked',
  amended: 'Amended',
};

/** `Rs. 1,234` — rounded (the sheet's `money`). */
const money = (n: number, sym: string) => `${sym} ${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
/** Keeps the paisa — for differences, where rounding would hide the point (`exactMoney`). */
const exactMoney = (n: number, sym: string) => `${sym} ${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const orDash = (n: number | null | undefined, f: (v: number) => string) => (n === null || n === undefined ? '—' : f(n));

/** `YYYY-MM-DD` → `DD-MM-YYYY`. */
function displayDate(iso: string): string {
  const [y, m, d] = (iso || '').split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso || '—';
}

/** `YYYY-MM-DD HH:mm` on the Karachi clock (UTC+5, no DST) — the web's `karachiDateStr` + `karachiTimeStr`. */
export function karachiStamp(iso: string | Date): string {
  const t = (typeof iso === 'string' ? new Date(iso) : iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const k = new Date(t + 5 * 3_600_000).toISOString();
  return `${k.slice(0, 10)} ${k.slice(11, 16)}`;
}

/** "+Rs. 500 (Over)" / "Rs. -200 (Short)" / "Rs. 0 (Matched)" / "—" — the word travels with the figure. */
export function differenceText(difference: number | null | undefined, sym: string): string {
  if (difference === null || difference === undefined) return '—';
  const word = difference === 0 ? 'Matched' : difference > 0 ? 'Over' : 'Short';
  return `${difference > 0 ? '+' : ''}${exactMoney(difference, sym)} (${word})`;
}

export function buildDailySalePrintText(
  detail: Pick<DailySaleRecordDetail, 'record' | 'branch'>,
  opts: { companyName: string; currencySymbol: string; now?: Date },
): string {
  const w = TEXT_COLUMNS.a4;
  const r: DailySaleRecord = detail.record;
  const branch = detail.branch ?? { name: r.branchName, address: null, city: null, phone: null };
  const sym = opts.currencySymbol || 'Rs.';
  const m = (n: number) => money(n, sym);
  const row = (label: string, value: string) => kvLine(label, value, w);
  const section = (title: string) => ['', title.toUpperCase(), ruleLine(w)];

  return joinLines([
    opts.companyName || 'Mountain Bakes',
    branch.name,
    ...(branch.address ? [`${branch.address}${branch.city ? `, ${branch.city}` : ''}`] : []),
    ...(branch.phone ? [branch.phone] : []),
    '='.repeat(w),
    ...centerText('DAILY SALE RECORD', w),
    ...row('Business Date:', displayDate(r.businessDate)),
    ...row('Generated:', karachiStamp(r.generatedAt ? r.generatedAt : (opts.now ?? new Date()))),
    ...row('Status:', STATUS_LABEL[r.status] ?? r.status),

    ...section('System Sales'),
    ...row('Total Sale', m(r.autoTotalSale)),
    ...row('Cash', m(r.autoCash)),
    ...row('Easypaisa', m(r.autoEasypaisa)),
    ...row('Foodpanda', m(r.autoFoodpanda)),
    ...row('Bank', m(r.autoBank)),
    ...(r.autoOther > 0 ? row('Other', m(r.autoOther)) : []),
    ...row('Payment Total', m(r.paymentTotal)),
    ...row('Discount (already deducted)', m(r.discount)),
    ...row('Cash Expense', m(r.cashExpense)),
    ...row('Cash on Table', m(r.expectedCashInHand)),
    ...(r.autoStaff > 0 ? row('Staff consumption (no payment taken)', m(r.autoStaff)) : []),
    ...row('Orders', String(r.orderCount)),

    ...section('Counted / Received'),
    ...row('Cash', orDash(r.manualCash, m)),
    ...row('Easypaisa', orDash(r.manualEasypaisa, m)),
    ...row('Bank', orDash(r.manualBank, m)),
    ...(r.fedByName ? row('Counted by', `${r.fedByName}${r.fedAt ? ` · ${karachiStamp(r.fedAt)}` : ''}`) : []),

    ...section('Difference'),
    ...row('Cash (vs Cash on Table)', differenceText(r.cashDifference, sym)),
    ...row('Easypaisa', differenceText(r.easypaisaDifference, sym)),
    ...row('Bank', differenceText(r.bankDifference, sym)),
    ...row('Overall', differenceText(r.overallDifference, sym)),

    '',
    '',
    '______________________________    ______________________________',
    `${'Prepared By'.padEnd(34)}Verified By`,
    `${(r.fedByName || '').padEnd(34)}${r.verifiedByName || r.lockedByName || ''}`,
    '',
    ruleLine(w),
    ...wrapText('This sheet reconciles recorded sales against physically received amounts. It does not alter any sale.', w),
  ]);
}
