/**
 * @format
 */
import { buildClosingSummaryText } from '@/features/closing/api/shareSummary';

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

describe('buildClosingSummaryText', () => {
  it('includes the branch, formatted date, and every required figure', () => {
    const text = buildClosingSummaryText({
      branchName: 'Committee Chowk Branch',
      date: '2026-10-16',
      totals: TOTALS,
      paymentMethods: [
        { method: 'cash', orderCount: 41, amount: 37100 },
        { method: 'easypaisa', orderCount: 9, amount: 9550 },
      ],
      stockSold: 166,
      stockReturned: 1,
      stockBalance: 53,
    });

    expect(text).toContain('Committee Chowk Branch');
    expect(text).toContain('16 Oct 2026');
    expect(text).toContain('Cash (41 orders): Rs. 37,100');
    expect(text).toContain('Easypaisa (9 orders): Rs. 9,550');
    expect(text).toContain('Sales: Rs. 46,650');
    expect(text).toContain('Discounts given: Rs. 900');
    expect(text).toContain('Expenses: Rs. 300');
    expect(text).toContain('Net: Rs. 46,350');
    expect(text).toContain('Cash in hand: Rs. 36,800');
    expect(text).toContain('Cash takings Rs. 37,100');
    expect(text).toContain('cash expenses Rs. 300');
    expect(text).toContain('Orders: 50 (0 cancelled)');
    expect(text).toContain('166 sold · 1 returned to production · 53 left on the shelf');
  });

  it('never includes emoji characters', () => {
    const text = buildClosingSummaryText({
      branchName: 'Branch',
      date: '2026-10-16',
      totals: TOTALS,
      paymentMethods: [],
      stockSold: 0,
      stockReturned: 0,
      stockBalance: 0,
    });
    // eslint-disable-next-line no-control-regex
    const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
    expect(hasEmoji).toBe(false);
  });

  it('singularizes "1 order" correctly in the payment-method breakdown', () => {
    const text = buildClosingSummaryText({
      branchName: 'Branch',
      date: '2026-10-16',
      totals: TOTALS,
      paymentMethods: [{ method: 'bank_account', orderCount: 1, amount: 500 }],
      stockSold: 0,
      stockReturned: 0,
      stockBalance: 0,
    });
    expect(text).toContain('Bank Account (1 order): Rs. 500');
  });
});
