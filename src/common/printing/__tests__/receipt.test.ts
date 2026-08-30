import type { SaleSlip } from '@/common/till/types';
import { decodeBase64 } from '@/common/test-utils/bytes';

import { preview } from '../escpos';
import { BLACK_COPPER_BC_89AC } from '../profiles';
import { saleReceiptBase64, saleReceiptBlocks, testPageBlocks } from '../receipt';

/**
 * The 80mm layout, read as the text it prints as.
 *
 * `escpos.preview` applies the same wrapping and padding `renderBlocks` does,
 * so a line that fits here fits on the roll — and a receipt asserted as text is
 * one a reviewer can see is right, which a base64 blob is not.
 */

const PROFILE = BLACK_COPPER_BC_89AC;
const COLUMNS = PROFILE.columns;

/** A live, synced branch sale: two lines, one of them discounted, cash tendered. */
function slip(overrides: Partial<SaleSlip> = {}): SaleSlip {
  return {
    lines: [
      { productId: 'p1', productName: 'Chocolate Truffle Cake', unitPrice: 1250, qty: 2, discount: 100 },
      { productId: 'p2', productName: 'Almond Croissant', unitPrice: 180, qty: 3, discount: 0 },
    ],
    totals: {
      grossSubtotal: 3040,
      discountTotal: 100,
      subtotal: 2940,
      taxRate: 17,
      taxAmount: 499.8,
      grandTotal: 3439.8,
    },
    paymentMethod: 'cash',
    customerName: '',
    customerPhone: '',
    notes: '',
    receivedCash: 3500,
    returned: 60.2,
    businessDate: '2026-08-30',
    currencySymbol: 'Rs.',
    confirmed: true,
    authoritative: true,
    ...overrides,
  };
}

function lines(sale: SaleSlip, context = {}): string[] {
  return preview(saleReceiptBlocks(sale, { profile: PROFILE, timeStr: '14:32', ...context }), COLUMNS);
}

describe('saleReceiptBlocks', () => {
  /**
   * The invariant the whole layout rests on. A line wider than the roll wraps
   * where the printer decides, which puts an amount on its own line under its
   * label — the single most common way a receipt from a system like this looks
   * broken.
   */
  it('keeps every line inside the profile width', () => {
    for (const line of lines(slip())) {
      expect({ line, width: line.length }).toEqual({ line, width: line.length });
      expect(line.length).toBeLessThanOrEqual(COLUMNS);
    }
  });

  it('puts each amount hard against the right edge', () => {
    const total = lines(slip()).find(l => l.startsWith('GRAND TOTAL'));
    expect(total).toBe(
      `GRAND TOTAL${' '.repeat(COLUMNS - 'GRAND TOTAL'.length - 'Rs. 3,439.8'.length)}Rs. 3,439.8`,
    );
    expect(total).toHaveLength(COLUMNS);
  });

  it('gives a product name the full width and its arithmetic the line below', () => {
    const out = lines(slip());
    const nameAt = out.indexOf('Chocolate Truffle Cake');
    expect(nameAt).toBeGreaterThan(-1);
    // `2 x Rs. 1,250` on the left, the line total on the right.
    expect(out[nameAt + 1]).toMatch(/^ {2}2 x Rs\. 1,250 +Rs\. 2,400$/);
    expect(out[nameAt + 2]).toMatch(/^ {2}less discount +-Rs\. 100$/);
  });

  it('omits the discount line for a line that was not discounted', () => {
    const out = lines(slip());
    const nameAt = out.indexOf('Almond Croissant');
    expect(out[nameAt + 1]).toMatch(/^ {2}3 x Rs\. 180 +Rs\. 540$/);
    expect(out[nameAt + 2]).not.toContain('less discount');
  });

  /**
   * The two hedges the screen carries, which matter more on paper because paper
   * leaves the shop. See the header of `SaleReceipt.tsx`.
   */
  it('prints no sale number, and says why, for a queued sale', () => {
    const out = lines(slip({ confirmed: false, orderNumber: undefined }));
    expect(out.some(l => l.startsWith('Sale no.'))).toBe(false);
    expect(out.join('\n')).toContain('waiting to sync');
  });

  it('quotes the server sale number when there is one', () => {
    const out = lines(slip({ orderNumber: 'ORD-1042' }));
    expect(out.find(l => l.startsWith('Sale no.'))).toContain('ORD-1042');
    expect(out.join('\n')).not.toContain('waiting to sync');
  });

  it("marks the total as an estimate when the figures are the till's own", () => {
    const out = lines(slip({ authoritative: false }));
    expect(out.find(l => l.startsWith('GRAND TOTAL'))).toContain('(estimate)');
    expect(out.join('\n')).toContain("Amounts are the till's own");
  });

  it('claims the server as the source only when it is', () => {
    const out = lines(slip());
    expect(out.find(l => l.startsWith('GRAND TOTAL'))).not.toContain('(estimate)');
    expect(out.join('\n')).toContain('Amounts as recorded by the server.');
  });

  it('drops the tax and discount rows when there are none', () => {
    const out = lines(
      slip({
        totals: {
          grossSubtotal: 540,
          discountTotal: 0,
          subtotal: 540,
          taxRate: 0,
          taxAmount: 0,
          grandTotal: 540,
        },
      }),
    ).join('\n');
    expect(out).not.toContain('Government Tax');
    expect(out).not.toMatch(/^Discount/m);
  });

  it('omits the cash rows when no tender was recorded', () => {
    const out = lines(slip({ receivedCash: null, returned: null })).join('\n');
    expect(out).not.toContain('Cash received');
  });

  it('shows the customer only when the sale has one', () => {
    expect(lines(slip()).join('\n')).not.toContain('Customer');
    expect(lines(slip({ customerName: 'Ayesha' })).join('\n')).toContain('Ayesha');
  });

  it('heads the receipt with the tenant name, falling back to the brand', () => {
    expect(lines(slip())[0]?.trim()).toBe('MOUNTAIN BAKES');
    expect(lines(slip(), { companyName: 'Mountain Bakes Gilgit' })[0]?.trim()).toBe(
      'Mountain Bakes Gilgit',
    );
  });

  it('prints the receipt footer only when one is configured', () => {
    expect(lines(slip()).join('\n')).not.toContain('Thank you');
    expect(lines(slip(), { footer: 'Thank you' }).join('\n')).toContain('Thank you');
  });

  /**
   * A long name is the case the two-line item layout exists for, and it must
   * wrap rather than push the amount off the roll.
   */
  it('wraps a product name too long for one line', () => {
    const out = lines(
      slip({
        lines: [
          {
            productId: 'p1',
            productName: 'Chocolate Truffle Celebration Cake with Fresh Raspberries 2lb',
            unitPrice: 4500,
            qty: 1,
            discount: 0,
          },
        ],
      }),
    );
    expect(out.filter(l => l.includes('Chocolate Truffle')).length).toBeGreaterThan(0);
    for (const line of out) expect(line.length).toBeLessThanOrEqual(COLUMNS);
  });
});

describe('saleReceiptBase64', () => {
  it('produces something the bridge can carry', () => {
    const payload = saleReceiptBase64(slip(), { profile: PROFILE, timeStr: '14:32' });
    expect(payload).toMatch(/^[A-Za-z0-9+/]+=*$/);
    // Round-trips to a stream that opens with `ESC @`.
    const bytes = decodeBase64(payload);
    expect(bytes.slice(0, 2)).toEqual([0x1b, 0x40]);
  });
});

describe('testPageBlocks', () => {
  /**
   * The ruler is the point of the test page: 48 characters that end at the edge
   * of the roll prove the column count, and 48 that wrap prove it wrong — which
   * is otherwise only discovered when a customer's total lands on its own line.
   */
  it('draws a ruler exactly one line wide', () => {
    const out = preview(testPageBlocks(PROFILE), COLUMNS);
    const ruler = out.find(l => l.startsWith('....5'));
    expect(ruler).toHaveLength(COLUMNS);
    expect(ruler).toContain('...45');
  });

  it('names the profile it is testing, so a wrong one is visible on the paper', () => {
    const out = preview(testPageBlocks(PROFILE), COLUMNS).join('\n');
    expect(out).toContain(PROFILE.label);
    expect(out).toContain('80 mm');
    expect(out).toContain('48 characters');
  });

  it('states the transliteration limit rather than leaving it to be discovered', () => {
    expect(preview(testPageBlocks(PROFILE), COLUMNS).join('\n')).toContain('question marks');
  });
});
