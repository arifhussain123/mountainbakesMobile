/**
 * @format
 */
import type { StockRow } from '@/api';
import {
  buildClosingReceiptText,
  selectPrintableBalanceStock,
  type ClosingReceiptInput,
} from '@/features/closing/api/closingReceipt';

const TOTALS = {
  sales: 46650,
  discounts: 900,
  expenses: 300,
  net: 46350,
  orderCount: 50,
  cancelled: 0,
  cashSales: 37100,
  cashExpenses: 300,
  cashInHand: 36800,
};

function row(productName: string, balance: unknown): StockRow {
  return {
    productId: productName,
    stockCode: productName,
    productName,
    isActive: true,
    opening: 0,
    newQty: 0,
    sold: 0,
    returned: 0,
    adjustment: 0,
    balance: balance as number,
  };
}

function input(overrides: Partial<ClosingReceiptInput> = {}): ClosingReceiptInput {
  return {
    branchName: 'Committee Chowk Branch',
    date: '2026-10-16',
    printedAt: new Date(2026, 9, 18, 20, 45),
    totals: TOTALS,
    paymentMethods: [
      { method: 'cash', orderCount: 41, amount: 37100 },
      { method: 'easypaisa', orderCount: 9, amount: 9550 },
    ],
    stockLines: [
      { productName: 'Cream Puff', balance: 12 },
      { productName: 'Chocolate Pastry', balance: 5 },
    ],
    ...overrides,
  };
}

describe('selectPrintableBalanceStock', () => {
  it('keeps positive balances and drops zero, negative, and invalid ones', () => {
    const lines = selectPrintableBalanceStock([
      row('Ten', 10),
      row('One', 1),
      row('Zero', 0),
      row('Negative', -3),
      row('NaN', NaN),
      row('Missing', undefined),
      row('Null', null),
      row('Garbage', 'abc'),
    ]);
    expect(lines).toEqual([
      { productName: 'Ten', balance: 10 },
      { productName: 'One', balance: 1 },
    ]);
  });
});

describe('buildClosingReceiptText', () => {
  it('prints branch, business date, balance stock, and every payment figure', () => {
    const text = buildClosingReceiptText(input(), '80mm');
    expect(text).toContain('MOUNTAIN BAKES');
    expect(text).toContain('BRANCH CLOSING');
    expect(text).toContain('Committee Chowk Branch');
    expect(text).toMatch(/Business Date\s+16 Oct 2026/);
    expect(text).toMatch(/Printed\s+18 Oct 2026/);
    expect(text).toMatch(/Cream Puff\s+12/);
    expect(text).toMatch(/Chocolate Pastry\s+5/);
    expect(text).toMatch(/Cash\s+Rs\. 37,100/);
    expect(text).toMatch(/Easypaisa\s+Rs\. 9,550/);
    expect(text).toMatch(/Total Sales\s+Rs\. 46,650/);
    expect(text).toMatch(/Discounts\s+Rs\. 900/);
    expect(text).toMatch(/Expenses\s+Rs\. 300/);
    expect(text).toMatch(/Closing Cash\s+Rs\. 36,800/);
    expect(text).toMatch(/Orders \/ Cancelled\s+50 \/ 0/);
    expect(text).toContain('End of Closing Report');
  });

  it('right-aligns amounts to the 80mm column edge', () => {
    const lines = buildClosingReceiptText(input(), '80mm').split('\n');
    const totalLine = lines.find((l) => l.startsWith('Total Sales'));
    expect(totalLine).toHaveLength(48);
    expect(totalLine?.endsWith('Rs. 46,650')).toBe(true);
  });

  it('still prints payment details when no product has balance stock', () => {
    const text = buildClosingReceiptText(input({ stockLines: [] }), '80mm');
    expect(text).toContain('No balance stock.');
    expect(text).not.toContain('Product');
    expect(text).toMatch(/Cash\s+Rs\. 37,100/);
    expect(text).toMatch(/Closing Cash\s+Rs\. 36,800/);
  });

  it('notes an empty sales day instead of printing no payment lines', () => {
    const text = buildClosingReceiptText(input({ paymentMethods: [] }), '80mm');
    expect(text).toContain('No sales recorded for this date.');
  });

  it('omits the Discounts line when nothing was discounted', () => {
    const text = buildClosingReceiptText(input({ totals: { ...TOTALS, discounts: 0 } }), '80mm');
    expect(text).not.toContain('Discounts');
  });

  it.each([
    ['80mm', 48],
    ['58mm', 32],
  ] as const)('never exceeds %s width (%i columns), wrapping long product names', (paper, columns) => {
    const longName = 'Extra Large Chocolate Fudge Celebration Cake With Lotus Biscoff';
    const text = buildClosingReceiptText(
      input({ stockLines: [{ productName: longName, balance: 3 }], branchName: 'A Very Long Branch Name For The Committee Chowk Area' }),
      paper,
    );
    for (const line of text.split('\n')) expect(line.length).toBeLessThanOrEqual(columns);
    // The whole name survives the wrap, and the quantity sits on its last line.
    const words = text.replace(/\s+/g, ' ');
    expect(words).toContain('Extra Large Chocolate');
    expect(words).toContain('Lotus Biscoff 3');
  });

  it('never includes emoji characters', () => {
    const text = buildClosingReceiptText(input(), '58mm');
    const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
    expect(hasEmoji).toBe(false);
  });
});
