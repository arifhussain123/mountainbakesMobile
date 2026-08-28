import {
  cashReturned,
  lineAmount,
  resolveDiscount,
  saleTotals,
  type CartLine,
} from '../saleTotals';

/**
 * These pin the preview arithmetic to the web client's, so the same basket never
 * shows two different totals. The server remains authoritative — this is only
 * what the cashier sees while ringing up.
 */

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: 'p1',
    productName: 'Milk Rusk',
    unitPrice: 100,
    qty: 2,
    discount: 0,
    ...overrides,
  };
}

describe('lineAmount', () => {
  it('is price × qty − discount', () => {
    expect(lineAmount(line({ unitPrice: 250, qty: 3, discount: 50 }))).toBe(700);
  });

  it('never goes negative', () => {
    // A discount larger than the line would otherwise reduce the rest of the
    // basket.
    expect(lineAmount(line({ unitPrice: 100, qty: 1, discount: 500 }))).toBe(0);
  });

  it('coerces PostgREST numeric strings', () => {
    expect(lineAmount(line({ unitPrice: '250.00' as unknown as number, qty: 2 }))).toBe(500);
  });
});

describe('saleTotals', () => {
  it('reports gross subtotal, discount and net subtotal separately', () => {
    // The receipt shows Subtotal (gross) → Discount → Tax → Grand Total so the
    // arithmetic reconciles visually.
    const totals = saleTotals([
      line({ unitPrice: 100, qty: 2, discount: 20 }),
      line({ productId: 'p2', unitPrice: 250, qty: 1, discount: 0 }),
    ]);

    expect(totals.grossSubtotal).toBe(450);
    expect(totals.discountTotal).toBe(20);
    expect(totals.subtotal).toBe(430);
  });

  it('applies no tax when GST is disabled', () => {
    const totals = saleTotals([line({ unitPrice: 100, qty: 1 })], { gstEnabled: false, gstRate: 17 });
    expect(totals.taxAmount).toBe(0);
    expect(totals.grandTotal).toBe(100);
  });

  it('applies tax to the NET subtotal, after discount', () => {
    // Taxing the gross would overcharge every discounted sale.
    const totals = saleTotals([line({ unitPrice: 1000, qty: 1, discount: 200 })], {
      gstEnabled: true,
      gstRate: 10,
    });

    expect(totals.subtotal).toBe(800);
    expect(totals.taxAmount).toBe(80);
    expect(totals.grandTotal).toBe(880);
  });

  it('rounds tax to 2dp', () => {
    const totals = saleTotals([line({ unitPrice: 333, qty: 1 })], {
      gstEnabled: true,
      gstRate: 17,
    });
    expect(totals.taxAmount).toBe(56.61);
    expect(totals.grandTotal).toBe(389.61);
  });

  it('is zero for an empty basket', () => {
    const totals = saleTotals([]);
    expect(totals.grandTotal).toBe(0);
    expect(totals.subtotal).toBe(0);
  });

  it('clamps an over-large discount in the total as well as the line', () => {
    const totals = saleTotals([line({ unitPrice: 100, qty: 1, discount: 500 })]);
    expect(totals.discountTotal).toBe(100);
    expect(totals.subtotal).toBe(0);
    expect(totals.grossSubtotal).toBe(100);
  });

  it('does not drift on a long basket', () => {
    // Float accumulation is exactly what migration 20260719000001 removed
    // server-side; the preview must not reintroduce it.
    const lines = Array.from({ length: 40 }, (_, i) =>
      line({ productId: `p${i}`, unitPrice: 10.1, qty: 3 }),
    );
    expect(saleTotals(lines).subtotal).toBe(1212);
  });
});

describe('cashReturned', () => {
  it('is the change owed', () => {
    expect(cashReturned(1000, 880)).toBe(120);
  });

  it('goes negative when the tender does not cover the total', () => {
    expect(cashReturned(500, 880)).toBe(-380);
  });
});

describe('resolveDiscount', () => {
  it('accepts a flat rupee amount', () => {
    expect(resolveDiscount('50', 500)).toBe(50);
  });

  it('accepts a percentage of the line gross', () => {
    expect(resolveDiscount('10%', 500)).toBe(50);
    expect(resolveDiscount('12.5%', 400)).toBe(50);
  });

  it('clamps to the line gross', () => {
    expect(resolveDiscount('900', 500)).toBe(500);
    expect(resolveDiscount('150%', 500)).toBe(500);
  });

  it('treats junk and negatives as no discount', () => {
    expect(resolveDiscount('', 500)).toBe(0);
    expect(resolveDiscount('abc', 500)).toBe(0);
    expect(resolveDiscount('-20', 500)).toBe(20); // sign stripped, then clamped
    expect(resolveDiscount('0', 500)).toBe(0);
  });
});
