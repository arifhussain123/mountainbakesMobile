import type { PreviousOrderBalance, PreviousOrderBalancePaymentItem, ProductionOrder } from '@/api/types';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import {
  TEXT_COLUMNS,
  centerText,
  joinLines,
  kvLine,
  numText,
  ruleLine,
  textRow,
  textTable,
  type TextColumn,
  type TextPaper,
} from '@/shared/utils/textLayout';

/**
 * Share-based "printing" of a production demand — shared by the Production
 * role's Order Detail and Super Admin's order slip.
 *
 * There is no native thermal-printer SDK anywhere in this app's dependencies
 * (adding Bluetooth/USB printer integration is real native-module work). Each
 * document is plain text handed to React Native's `Share` sheet, which the
 * user routes to any app that accepts a share — on most Android devices
 * including a system "Print" service. It is not the till's POP printer; it is
 * the closest honest equivalent without a new native dependency.
 *
 * Two families live here:
 *   - `buildPopPrintText` / `buildA4ChallanText` — the Production role's own
 *     slips, moved here unchanged from its Order Detail screen.
 *   - `buildOrderPopText` / `buildOrderChallanText` / `buildProductionCheckText`
 *     — the web's three documents (`OrderPrintPreview.tsx`: the POP receipt
 *     `buildProductionOrderDocument`, the two-copy A4 delivery challan
 *     `PrintCopy`, and the `ProductionCheckSheet`), section for section.
 */

// ─── The Production role's slips ───────────────────────────────────────────

export function buildPopPrintText(order: ProductionOrder): string {
  const lines = order.items.map(
    (i) => `${i.productName}${i.isSpecial ? ' (Special)' : ''} x${i.qty}  ${formatCurrency((i.unitPrice ?? 0) * i.qty)}`,
  );
  const total = order.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  return [
    'Mountain Bakes — Production Department',
    `Demand ${order.demandNumber}`,
    order.branchName,
    `Raised ${formatDisplayDate(order.date)}${order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}`,
    '',
    ...lines,
    '',
    `Total  ${formatCurrency(total)}`,
  ].join('\n');
}

export function buildA4ChallanText(order: ProductionOrder, balance: PreviousOrderBalance | undefined): string {
  const itemLines = order.items.map(
    (i) => `${i.productName}  Demand ${i.qty}  Appr. ${i.approvedQty ?? i.qty}  ${formatCurrency((i.unitPrice ?? 0) * i.qty)}`,
  );
  const total = order.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  const copy = (label: string) =>
    [
      `--- ${label} ---`,
      'Mountain Bakes — Production Department',
      `Demand ${order.demandNumber}  ·  ${order.branchName}`,
      `Raised ${formatDisplayDate(order.date)}${order.requiredDate ? ` · Required ${formatDisplayDate(order.requiredDate)}` : ''}`,
      '',
      ...itemLines,
      `Totals  ${formatCurrency(total)}`,
      ...(label === 'Company Copy' && balance?.previous
        ? [
            '',
            `Previous order ${balance.previous.demandNumber} (${formatDisplayDate(balance.previous.date)})`,
            `Amount to collect  ${formatCurrency(balance.amountToCollect)}`,
            `Payments received  ${formatCurrency(balance.paymentsReceivedValue)}`,
            `Remaining balance  ${formatCurrency(balance.remainingBalance)}`,
          ]
        : []),
    ].join('\n');
  return [copy('Customer Copy'), '\n'.repeat(1) + '— — — — — — cut here — — — — — —\n', copy('Company Copy')].join('\n');
}

// ─── The web's three documents ─────────────────────────────────────────────

/** The slip's reference: `PO-` + raised date without dashes + `-` + time without the colon. */
export function slipReference(order: Pick<ProductionOrder, 'date' | 'time'>): string {
  return `PO-${(order.date || '').replace(/-/g, '')}-${(order.time || '').replace(':', '')}`;
}

/** `YYYY-MM-DD` as `DD/MM/YYYY` — string work, these are already Karachi dates. */
export function compactDate(iso: string): string {
  const [y, m, d] = (iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso || '—';
}

/** The slip's status words (shown upper-cased there); other statuses print as stored. */
const SLIP_STATUS: Record<string, string> = {
  awaiting_verification: 'Awaiting Verification',
  verified: 'Verified — Awaiting Approval',
};

const CASH_TRANSFER_METHOD_LABEL = { cash: 'Cash', easypaisa: 'Easypaisa', bank_account: 'Bank Account' } as const;

/** The web's `cashTransferChannelsLabel` — "Cash + Easypaisa", "Fuel only" or "—". */
function channelsLabel(p: PreviousOrderBalancePaymentItem): string {
  const n = (v: unknown) => Number(v) || 0;
  const used = (
    [
      ['cash', n(p.cashAmount)],
      ['easypaisa', n(p.easypaisaAmount)],
      ['bank_account', n(p.bankAmount)],
    ] as const
  )
    .filter(([, v]) => v > 0)
    .map(([m]) => CASH_TRANSFER_METHOD_LABEL[m]);
  if (used.length > 0) return used.join(' + ');
  return n(p.fuelCharges) > 0 ? 'Fuel only' : '—';
}

export interface SlipPrintLine {
  productName: string;
  /** What ships: the approved figure once reviewed, the on-screen figure while pending. */
  approved: number;
  unitPrice: number;
  amount: number;
}

export interface SlipPrintInput {
  order: Pick<ProductionOrder, 'demandNumber' | 'date' | 'time' | 'requiredDate' | 'branchName' | 'status'>;
  /** The branch's name from the branch list, when known (the web's `branch?.name || order.branchName`). */
  branchName?: string | null;
  companyName: string;
  currencySymbol: string;
  /** Every line — zero-approved ones are dropped here, as every web slip drops them. */
  lines: SlipPrintLine[];
  /** Packing lines at their approved quantity. */
  packing: { materialName: string; qty: number }[];
  /** `undefined` while the previous balance is loading (the block is left off), `null` when there is none. */
  balance: PreviousOrderBalance | null | undefined;
  /** The print stamp, e.g. "20 Oct 2026" and "10:30 AM". */
  printDate: string;
  printTime: string;
}

const shipping = (lines: SlipPrintLine[]) => lines.filter((l) => l.approved > 0);

/**
 * POP Print — the web receipt `buildProductionOrderDocument`: company and
 * department, the order's facts, PRODUCT / QTY / RATE / AMOUNT for the lines
 * going out, the total, packing materials, the previous order's collection
 * working, and the two signature lines.
 */
export function buildOrderPopText(input: SlipPrintInput, paper: Exclude<TextPaper, 'a4'> = '80mm'): string {
  const w = TEXT_COLUMNS[paper];
  const sym = input.currencySymbol.trim() || 'Rs.';
  const money = (n: number) => `${sym} ${numText(n)}`;
  const { order } = input;
  const lines = shipping(input.lines);
  const packing = input.packing.filter((p) => p.qty > 0);
  const totalQty = lines.reduce((s, l) => s + l.approved, 0);
  const grandTotal = input.lines.reduce((s, l) => s + l.amount, 0);
  const narrow = w < 40;
  const cols: TextColumn[] = [
    { header: 'Product' },
    { header: 'Qty', width: narrow ? 4 : 5 },
    { header: 'Rate', width: narrow ? 6 : 8 },
    { header: 'Amount', width: narrow ? 7 : 10 },
  ];
  const b = input.balance;
  const balanceBlock: string[] =
    b === undefined
      ? []
      : !b?.previous
        ? ['PREVIOUS ORDER BALANCE', 'No previous delivery — nothing to collect.', ruleLine(w)]
        : [
            'PREVIOUS ORDER BALANCE',
            ...kvLine('Order No', b.previous.demandNumber, w),
            ...kvLine('Order Date', b.previous.date, w),
            ...kvLine('Previous Order', money(b.orderedValue), w),
            ...kvLine('Delivered Value', money(b.deliveredValue), w),
            ...kvLine('Company Share', money(b.companyShareValue), w),
            ...kvLine('Less Returns', money(b.returnsValue), w),
            ...kvLine('Less Discount', money(b.discountsValue), w),
            ruleLine(w, true),
            ...kvLine('AMOUNT TO COLLECT', money(b.amountToCollect), w),
            ...kvLine('Payment Received', money(b.paymentsReceivedValue), w),
            ...kvLine('Remaining Balance', money(b.remainingBalance ?? Math.max(0, b.amountToCollect - b.paymentsReceivedValue)), w),
            ruleLine(w),
          ];

  return joinLines([
    ...centerText((input.companyName.trim() || 'Mountain Bakes').toUpperCase(), w),
    ...centerText('Production Department', w),
    ...centerText('Production Order', w),
    ruleLine(w),
    ...kvLine('Order No', order.demandNumber || slipReference(order), w),
    ...kvLine('Branch', input.branchName || order.branchName || '—', w),
    ...kvLine('Date', compactDate(order.date), w),
    ...kvLine('Time', order.time || input.printTime || '—', w),
    ...kvLine('Required Date', order.requiredDate ? compactDate(order.requiredDate) : '—', w),
    ruleLine(w),
    ...textTable(cols, lines.map((l) => [l.productName, numText(l.approved), numText(l.unitPrice), numText(l.amount)]), w),
    ruleLine(w),
    ...kvLine('Total Qty', numText(totalQty), w),
    ...kvLine('TOTAL', money(grandTotal), w),
    ruleLine(w),
    ...(packing.length > 0
      ? [
          'PACKING MATERIALS',
          ...textTable([{ header: 'Packing Material' }, { header: 'Qty', width: 6 }], packing.map((p) => [p.materialName, numText(p.qty)]), w),
          ...kvLine('Packing Qty', numText(packing.reduce((s, p) => s + p.qty, 0)), w),
          ruleLine(w),
        ]
      : []),
    ...balanceBlock,
    '',
    ...kvLine('Collected By', 'Received By', w),
    '',
    ...centerText('* Design & developed by arifsiksavi@gmail.com | 0322-2050545 *', w),
  ]);
}

/** One copy of the A4 challan — the web's `PrintCopy`. */
function challanCopy(copyLabel: 'Customer Copy' | 'Company Copy', input: SlipPrintInput, w: number): string[] {
  const sym = input.currencySymbol || 'Rs.';
  const money = (n: number) => `${sym}${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
  const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US');
  const isCompanyCopy = copyLabel === 'Company Copy';
  const { order } = input;
  const items = shipping(input.lines);
  const packing = input.packing.filter((p) => p.qty > 0);
  const totalQty = items.reduce((a, r) => a + r.approved, 0);
  const grandTotal = items.reduce((a, r) => a + r.amount, 0);
  const meta = (k: string, v: string | null | undefined) => kvLine(`${k}:`, v || '—', w);
  const b = input.balance;
  const returnsQty = (b?.returnItems ?? []).reduce((a, r) => a + (Number(r.qty) || 0), 0);
  const remaining = b ? (b.remainingBalance ?? Math.max(0, b.amountToCollect - b.paymentsReceivedValue)) : 0;
  const productCols: TextColumn[] = [{ header: 'Product' }, { header: 'Approved Qty', width: 12 }, { header: 'Unit Price', width: 11 }, { header: 'Amount', width: 12 }];

  return [
    copyLabel.toUpperCase().padStart(w),
    // The Company Copy is an internal working copy: no branded heading.
    ...(isCompanyCopy ? [] : [input.companyName || 'Mountain Bakes', 'Production Department', 'PRODUCTION ORDER']),
    '='.repeat(w),
    ...meta('Production Order No', slipReference(order)),
    ...meta('Demand Date', order.date),
    ...meta('Required Date', order.requiredDate ?? ''),
    ...meta('Branch', order.branchName),
    ...meta('Print Date', input.printDate),
    ...meta('Print Time', input.printTime),
    ...meta('Status', (SLIP_STATUS[order.status] ?? order.status).toUpperCase()),
    ruleLine(w),
    // On BOTH copies: the rider collects this in cash at the counter.
    'PREVIOUS ORDER BALANCE',
    ...(b?.previous
      ? [
          ...meta('Previous Order No', b.previous.demandNumber),
          ...meta('Previous Demand Date', b.previous.date),
          ...meta('Delivered Value', money(b.deliveredValue)),
          ...meta('Company Share', money(b.companyShareValue)),
          ...meta('Less Returns', returnsQty > 0 ? `${fmt(returnsQty)} · ${money(b.returnsValue)}` : '—'),
          ...meta('Less Discount', b.discountsValue > 0 ? money(b.discountsValue) : '—'),
          ...meta('Amount to Collect', money(b.amountToCollect)),
          ...meta('Payment Received', b.paymentsReceivedValue > 0 ? money(b.paymentsReceivedValue) : '—'),
          ...meta('Remaining Balance', money(remaining)),
        ]
      : ['No previous delivery for this branch — nothing to collect.']),
    ...(isCompanyCopy && b && b.returnItems.length > 0
      ? [
          '',
          'RETURN ITEMS (SINCE LAST ORDER)',
          ...textTable(
            [{ header: 'Product' }, { header: 'Qty', width: 8 }, { header: 'Value', width: 12 }],
            b.returnItems.map((r) => [r.productName, fmt(r.qty), money(r.amount)]),
            w,
          ),
          ruleLine(w),
          ...textRow([{ header: '' }, { header: '', width: 8 }, { header: '', width: 12 }], ['Total', fmt(returnsQty), money(b.returnsValue)], w),
        ]
      : []),
    ...(isCompanyCopy && b && b.discountItems.length > 0
      ? [
          '',
          'DISCOUNTS (SINCE LAST ORDER)',
          ...textTable([{ header: 'Against Demand' }, { header: 'Amount', width: 12 }], b.discountItems.map((d) => [d.demandNumber, money(d.amount)]), w),
          ruleLine(w),
          ...textRow([{ header: '' }, { header: '', width: 12 }], ['Total', money(b.discountsValue)], w),
        ]
      : []),
    ...(isCompanyCopy && b && b.paymentItems.length > 0
      ? [
          '',
          'PAYMENTS RECEIVED (SINCE LAST ORDER, FULL DAYS)',
          ...textTable(
            [
              { header: 'Transfer' },
              { header: 'Voucher', width: 12, align: 'left' },
              { header: 'Date', width: 10, align: 'left' },
              { header: 'Method', width: 12, align: 'left' },
              { header: 'Amount', width: 10 },
            ],
            b.paymentItems.map((p) => [
              String(p.transferNo ?? '—'),
              String(p.voucherNo ?? '—'),
              String(p.date ?? ''),
              channelsLabel(p),
              money(p.amount),
            ]),
            w,
          ),
          ruleLine(w),
          ...kvLine('Total', money(b.paymentsReceivedValue), w),
        ]
      : []),
    '',
    ...(items.length === 0
      ? [...textTable(productCols, [], w), 'No approved products.']
      : [
          ...textTable(productCols, items.map((r) => [r.productName, fmt(r.approved), money(r.unitPrice), money(r.amount)]), w),
          ruleLine(w),
          ...textRow(productCols, ['Totals', fmt(totalQty), '', money(grandTotal)], w),
        ]),
    '',
    ...kvLine('Total Qty', fmt(totalQty), w),
    ...kvLine('Grand Total Amount', money(grandTotal), w),
    // Packing carries no price, so it never folds into the grand total.
    ...(packing.length > 0
      ? [
          '',
          'PACKING MATERIALS',
          ...textTable([{ header: 'Item' }, { header: 'Qty', width: 8 }], packing.map((p) => [p.materialName, fmt(p.qty)]), w),
          ruleLine(w),
          ...textRow([{ header: '' }, { header: '', width: 8 }], ['Total', fmt(packing.reduce((a, p) => a + p.qty, 0))], w),
        ]
      : []),
    // The internal cash-collection log — Company Copy only.
    ...(isCompanyCopy
      ? ['', 'PAYMENT', `Cash Paid: ${sym} ____________`, 'Payment Status: ____________', 'Received By (Rider): ____________', 'Signature: ____________']
      : []),
  ];
}

/**
 * A4 Challan — the web's two-copy delivery challan: Customer Copy on top,
 * Company Copy below the cut line. Both carry the Previous Order Balance;
 * the itemised returns / discounts / payments and the payment log are on the
 * Company Copy only.
 */
export function buildOrderChallanText(input: SlipPrintInput): string {
  const w = TEXT_COLUMNS.a4;
  return joinLines([
    ...challanCopy('Customer Copy', input, w),
    '',
    ...centerText('— — — — — — cut here — — — — — —', w),
    '',
    ...challanCopy('Company Copy', input, w),
  ]);
}

/**
 * Production Check — the web's floor sheet: Branch, Product, Qty, Amount for
 * the lines going out, nothing else. Not a delivery document.
 */
export function buildProductionCheckText(input: SlipPrintInput): string {
  const w = TEXT_COLUMNS.a4;
  const sym = input.currencySymbol || 'Rs.';
  const money = (n: number) => `${sym}${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
  const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US');
  const { order } = input;
  const items = shipping(input.lines);
  const totalQty = items.reduce((a, r) => a + r.approved, 0);
  const totalAmount = items.reduce((a, r) => a + r.amount, 0);
  const meta = (k: string, v: string | null | undefined) => kvLine(`${k}:`, v || '—', w);
  return joinLines([
    'PRODUCTION CHECK',
    ...meta('Branch', order.branchName),
    ...meta('Production Order No', slipReference(order)),
    ...meta('Demand Date', order.date),
    ...meta('Required Date', order.requiredDate ?? ''),
    ...meta('Print Date', input.printDate),
    '='.repeat(w),
    ...(items.length === 0
      ? ['No approved products.']
      : textTable([{ header: 'Product' }, { header: 'Qty', width: 8 }, { header: 'Amount', width: 12 }], items.map((r) => [r.productName, fmt(r.approved), money(r.amount)]), w)),
    '='.repeat(w),
    `Total Qty: ${fmt(totalQty)}    Total Amount: ${money(totalAmount)}`,
  ]);
}
