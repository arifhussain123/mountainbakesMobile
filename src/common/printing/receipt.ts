import { paymentMethodLabel } from '@/common/constants/paymentMethods';
import { lineAmount } from '@/common/helpers/saleTotals';
import { formatCurrency, formatQty } from '@/common/utils/money';
import { karachiTimeStr } from '@/shared/utils/timezone';

import type { SaleSlip } from '@/common/till/types';
import type { Block, TextBlock } from './escpos';
import { renderBlocks, toBase64 } from './escpos';
import type { PrinterProfile } from './profiles';
import { DEFAULT_PROFILE } from './profiles';

/**
 * The sale slip, laid out for an 80mm roll.
 *
 * ---------------------------------------------------------------------------
 * A third rendering of one sale, and why it is not a third copy of the layout
 * ---------------------------------------------------------------------------
 * `SaleReceipt.tsx` already renders the slip twice: as cards on the screen, and
 * as `asPlainText` for the share sheet. Neither can be reused here, and the
 * reason differs for each.
 *
 * The screen is React components with a type scale and colour — there is no
 * text in it to send. `asPlainText` is closer but is deliberately *unaligned*:
 * its own comment says why, namely that a receipt padded to a monospace column
 * wraps into nonsense in a WhatsApp bubble. On paper the opposite is true — a
 * column of amounts that does not line up is what makes a printed receipt look
 * like something the shop knocked together.
 *
 * So this is a third layout on purpose, and the three share their *figures*
 * rather than their formatting: all of them go through `lineAmount`,
 * `formatCurrency` and `formatQty`, which is where a disagreement would
 * actually cost something.
 *
 * ---------------------------------------------------------------------------
 * What it will not pretend
 * ---------------------------------------------------------------------------
 * The same two hedges the screen carries, and they matter more here because
 * paper leaves the shop. A queued sale prints "waiting to sync — no sale number
 * yet" rather than a reference a customer could quote at a counter that has
 * never heard of it, and a slip whose totals are the till's own arithmetic says
 * so rather than reading as the server's record. See the header of
 * `SaleReceipt.tsx` for the full reasoning; it is not repeated here so the two
 * cannot drift into two different explanations.
 */

export interface ReceiptContext {
  branchName?: string | null;
  /** `AppSettings.companyName`. The brand is the fallback. */
  companyName?: string | null;
  /** `AppSettings.receiptFooter`. Printed only when it is set. */
  footer?: string | null;
  profile?: PrinterProfile;
  /**
   * The time on the slip. Injected so a test can pin the clock — everything
   * else on a receipt is derived from the sale, but this is read from `now`,
   * and a test that cannot fix it can only assert around it.
   */
  timeStr?: string;
}

const BRAND = 'MOUNTAIN BAKES';

/**
 * A label and an amount on one line, the amount hard against the right edge.
 *
 * Not `align: 'right'` on the block: that would push the label right as well.
 * The pad is measured against the full column count because every row that uses
 * this is single-width — a double-width one would have to halve it, and there
 * is none.
 *
 * A pair too long for the line keeps one space between them and overflows,
 * which the wrapper then breaks. That beats truncating, because the amount is
 * the one thing on a receipt that has to be readable in full.
 */
export function amountRow(label: string, amount: string, columns: number): TextBlock {
  const slack = columns - label.length - amount.length;
  return { kind: 'text', text: `${label}${' '.repeat(Math.max(1, slack))}${amount}` };
}

/**
 * The blocks for one sale.
 *
 * Exported apart from [saleReceiptBytes] so a test can read the receipt as text
 * through `escpos.preview`. Asserting a receipt as base64 is a test that cannot
 * fail informatively.
 */
export function saleReceiptBlocks(sale: SaleSlip, context: ReceiptContext = {}): Block[] {
  const columns = (context.profile ?? DEFAULT_PROFILE).columns;
  const symbol = sale.currencySymbol;
  const blocks: Block[] = [];

  // ---- Head ---------------------------------------------------------------
  blocks.push({
    kind: 'text',
    text: context.companyName?.trim() || BRAND,
    align: 'center',
    style: { bold: true, doubleHeight: true },
  });
  if (context.branchName) {
    blocks.push({ kind: 'text', text: context.branchName, align: 'center' });
  }
  blocks.push({ kind: 'rule' });

  // ---- What this sale is --------------------------------------------------
  if (sale.orderNumber) {
    blocks.push(amountRow('Sale no.', sale.orderNumber, columns));
  }
  blocks.push(
    amountRow(sale.businessDate, context.timeStr ?? karachiTimeStr(), columns),
    amountRow('Payment', paymentMethodLabel(sale.paymentMethod), columns),
  );
  if (sale.customerName) blocks.push(amountRow('Customer', sale.customerName, columns));
  if (sale.customerPhone) blocks.push(amountRow('Mobile', sale.customerPhone, columns));
  blocks.push({ kind: 'rule' });

  // ---- The basket ---------------------------------------------------------
  /*
   * Two lines per item rather than one row of four columns.
   *
   * A product name at this shop runs past twenty characters routinely
   * ("Chocolate Truffle Celebration Cake"), and squeezing name, quantity, rate
   * and amount into 48 leaves the name about sixteen — so the thing the
   * customer is checking is the one thing abbreviated away. The name gets the
   * full width and wraps; the arithmetic sits under it, indented, with the
   * amount at the right edge where the eye runs down the column.
   */
  for (const line of sale.lines) {
    blocks.push({ kind: 'text', text: line.productName, style: { bold: true } });
    const rate = `${formatQty(line.qty)} x ${formatCurrency(line.unitPrice, symbol)}`;
    blocks.push(amountRow(`  ${rate}`, formatCurrency(lineAmount(line), symbol), columns));
    if (line.discount > 0) {
      blocks.push(
        amountRow('  less discount', `-${formatCurrency(line.discount, symbol)}`, columns),
      );
    }
  }
  blocks.push({ kind: 'rule' });

  // ---- Money --------------------------------------------------------------
  blocks.push(amountRow('Subtotal', formatCurrency(sale.totals.grossSubtotal, symbol), columns));
  if (sale.totals.discountTotal > 0) {
    blocks.push(
      amountRow('Discount', `-${formatCurrency(sale.totals.discountTotal, symbol)}`, columns),
    );
  }
  if (sale.totals.taxAmount > 0) {
    blocks.push(amountRow('Government Tax', formatCurrency(sale.totals.taxAmount, symbol), columns));
  }

  /*
   * The grand total is double HEIGHT and not double width. Double width halves
   * the line to 24 characters, and "GRAND TOTAL" plus a five-figure amount does
   * not fit in 24 — it would wrap, putting the total on its own line under its
   * label. Height alone gives the emphasis and keeps the column maths at 48.
   *
   * `(estimate)` is the paper form of the screen's estimate mark on `MBMoney`.
   * Same condition, same meaning: these figures are this till's, not the
   * server's.
   */
  const total = `${formatCurrency(sale.totals.grandTotal, symbol)}${
    sale.authoritative ? '' : ' (estimate)'
  }`;
  blocks.push({
    ...amountRow('GRAND TOTAL', total, columns),
    style: { bold: true, doubleHeight: true },
  });

  if (sale.receivedCash !== null) {
    blocks.push(
      amountRow('Cash received', formatCurrency(sale.receivedCash, symbol), columns),
      amountRow('Cash returned', formatCurrency(sale.returned ?? 0, symbol), columns),
    );
  }

  // ---- The two sentences it owes the reader -------------------------------
  blocks.push({ kind: 'rule' });
  if (!sale.confirmed) {
    blocks.push({
      kind: 'text',
      text: 'Saved on the till and waiting to sync - no sale number yet.',
      align: 'center',
    });
  }
  blocks.push({
    kind: 'text',
    text: sale.authoritative
      ? 'Amounts as recorded by the server.'
      : "Amounts are the till's own; the server confirms the final figures.",
    align: 'center',
  });

  if (context.footer?.trim()) {
    blocks.push({ kind: 'feed', lines: 1 }, { kind: 'text', text: context.footer.trim(), align: 'center' });
  }

  return blocks;
}

export function saleReceiptBytes(sale: SaleSlip, context: ReceiptContext = {}): number[] {
  const profile = context.profile ?? DEFAULT_PROFILE;
  return renderBlocks(saleReceiptBlocks(sale, context), profile.columns);
}

export function saleReceiptBase64(sale: SaleSlip, context: ReceiptContext = {}): string {
  return toBase64(saleReceiptBytes(sale, context));
}

/**
 * The test page, which exists to answer three questions at once.
 *
 * Is the link up, is the paper the width the profile thinks it is, and does
 * this printer render what the app sends. The ruler line is the second of those
 * and it is the one worth having: 48 characters that end exactly at the edge of
 * the roll prove the column count, and 48 that wrap prove it wrong — which is
 * otherwise only discovered when a customer's total ends up on its own line.
 *
 * It also states the transliteration limit plainly rather than leaving someone
 * to find it on a real receipt. See `escpos.encode`.
 */
export function testPageBlocks(profile: PrinterProfile, context: ReceiptContext = {}): Block[] {
  const columns = profile.columns;
  return [
    {
      kind: 'text',
      text: context.companyName?.trim() || BRAND,
      align: 'center',
      style: { bold: true, doubleHeight: true },
    },
    { kind: 'text', text: 'Printer test page', align: 'center' },
    { kind: 'rule' },
    amountRow('Profile', profile.label, columns),
    amountRow('Paper', `${profile.paperWidthMm} mm`, columns),
    amountRow('Line width', `${columns} characters`, columns),
    { kind: 'text', text: rulerFor(columns) },
    { kind: 'text', text: 'The line above must end at the edge of the roll.' },
    { kind: 'rule' },
    { kind: 'text', text: 'Normal' },
    { kind: 'text', text: 'Bold', style: { bold: true } },
    { kind: 'text', text: 'Tall', style: { doubleHeight: true } },
    { kind: 'text', text: 'Wide', style: { doubleWidth: true } },
    { kind: 'rule' },
    amountRow('Sample amount', 'Rs. 12,345.67', columns),
    {
      kind: 'text',
      text: 'Latin text only. Urdu and other non-Latin names print as question marks.',
    },
  ];
}

export function testPageBase64(profile: PrinterProfile, context: ReceiptContext = {}): string {
  return toBase64(renderBlocks(testPageBlocks(profile, context), profile.columns));
}

/**
 * `....5...10...15...` up to the column count, ending on the exact character.
 *
 * A row of identical dashes would prove the width just as well but would say
 * nothing about *where* a wrap happened when it is wrong. This one is readable
 * as a measurement.
 */
function rulerFor(columns: number): string {
  let out = '';
  while (out.length < columns) {
    const next = out.length + 5;
    const marker = String(next);
    // Each group is five wide: dots, then the multiple-of-five it lands on,
    // right-aligned into the group so the digits fall on the mark they name.
    out += `${'.'.repeat(Math.max(0, 5 - marker.length))}${marker}`;
  }
  return out.slice(0, columns);
}
