/**
 * @format
 */
import {
  computeCashReturned,
  computeGrandTotal,
  computeLineAmount,
  computeLineGross,
  computeTax,
  resolveDiscount,
  summarizeItemsSold,
  summarizeOrders,
} from '@/features/sales/calculations';
import type { Order, OrderItemResult } from '@/api';

describe('resolveDiscount', () => {
  it('parses a flat amount', () => {
    expect(resolveDiscount('50', 500)).toBe(50);
  });

  it('parses a percentage of the line gross', () => {
    expect(resolveDiscount('10%', 500)).toBe(50);
  });

  it('rounds to 2 decimal places', () => {
    expect(resolveDiscount('33.333%', 100)).toBeCloseTo(33.33, 2);
  });

  it('returns 0 for empty input', () => {
    expect(resolveDiscount('', 500)).toBe(0);
    expect(resolveDiscount('   ', 500)).toBe(0);
  });

  it('returns 0 for invalid input', () => {
    expect(resolveDiscount('abc', 500)).toBe(0);
  });

  it('clamps an amount discount to the line gross — never exceeds it', () => {
    expect(resolveDiscount('999', 500)).toBe(500);
  });

  it('clamps a percentage discount over 100% to the line gross', () => {
    // Regression: the previous implementation only clamped the flat-amount branch,
    // letting "150%" produce a discount larger than the line itself (a negative line amount).
    expect(resolveDiscount('150%', 500)).toBe(500);
  });

  it('rejects a negative percentage rather than producing a negative discount', () => {
    expect(resolveDiscount('-10%', 500)).toBe(0);
  });

  it('rejects a negative flat amount', () => {
    expect(resolveDiscount('-50', 500)).toBe(0);
  });

  it('rejects a zero percentage', () => {
    expect(resolveDiscount('0%', 500)).toBe(0);
  });
});

describe('line amount / gross', () => {
  it('computes gross as qty × rate', () => {
    expect(computeLineGross(4, 150)).toBe(600);
  });

  it('computes amount as gross − discount', () => {
    expect(computeLineAmount(600, 50)).toBe(550);
  });
});

describe('tax / grand total / cash returned', () => {
  it('applies tax on the post-discount subtotal, rounded to 2dp', () => {
    expect(computeTax(10_000, 0.05)).toBe(500);
    expect(computeTax(333.33, 0.1)).toBeCloseTo(33.33, 2);
  });

  it('is zero when the tax rate is zero', () => {
    expect(computeTax(10_000, 0)).toBe(0);
  });

  it('grand total is subtotal plus tax', () => {
    expect(computeGrandTotal(10_000, 500)).toBe(10_500);
  });

  it('cash returned is received minus grand total, and can be negative when underpaid', () => {
    expect(computeCashReturned(1000, 850)).toBe(150);
    expect(computeCashReturned(500, 850)).toBe(-350);
  });
});

function makeOrder(overrides: Partial<Order> & { items: OrderItemResult[] }): Order {
  return {
    id: overrides.id ?? 'o1',
    orderNumber: overrides.orderNumber ?? 'MB-000001',
    branchId: 'b1',
    branchName: 'Committee Chowk',
    customerName: 'Walking Customer',
    customerPhone: '',
    status: 'delivered',
    paymentMethod: overrides.paymentMethod ?? 'cash',
    subtotal: overrides.subtotal ?? 0,
    discountTotal: overrides.discountTotal ?? 0,
    taxAmount: overrides.taxAmount ?? 0,
    grandTotal: overrides.grandTotal ?? 0,
    receivedCash: null,
    cashReturned: null,
    notes: '',
    businessDate: '2026-10-16',
    createdAt: '2026-10-16T12:00:00.000Z',
    items: overrides.items,
  };
}

function item(productName: string, qty: number, unitPrice: number, discount = 0): OrderItemResult {
  return { productId: productName, productName, qty, discount, unitPrice, lineTotal: unitPrice * qty - discount, categoryId: null, categoryName: null };
}

describe('summarizeOrders', () => {
  it('sums method nets to the total sales figure', () => {
    const orders: Order[] = [
      makeOrder({ id: '1', paymentMethod: 'cash', grandTotal: 1200, discountTotal: 0, items: [item('Cream Puff', 4, 300)] }),
      makeOrder({ id: '2', paymentMethod: 'easypaisa', grandTotal: 800, discountTotal: 0, items: [item('Pastry', 2, 400)] }),
    ];
    const summary = summarizeOrders(orders);
    const sumOfMethodNets = Object.values(summary.byMethod).reduce((sum, m) => sum + m.net, 0);
    expect(sumOfMethodNets).toBe(summary.totalSales);
    expect(summary.totalSales).toBe(2000);
  });

  it('gross minus discount equals total sales when there is no tax', () => {
    const orders: Order[] = [
      makeOrder({ id: '1', paymentMethod: 'cash', grandTotal: 1150, discountTotal: 50, items: [item('Cream Puff', 4, 300)] }),
    ];
    const summary = summarizeOrders(orders);
    expect(summary.totalGross - summary.totalDiscount).toBe(summary.totalSales);
    expect(summary.totalGross).toBe(1200);
  });

  it('excludes staff sales from every money figure, reporting them separately', () => {
    const orders: Order[] = [
      makeOrder({ id: '1', paymentMethod: 'cash', grandTotal: 500, items: [item('Cake', 1, 500)] }),
      makeOrder({ id: '2', paymentMethod: 'staff' as Order['paymentMethod'], grandTotal: 300, items: [item('Cake', 1, 300)] }),
    ];
    const summary = summarizeOrders(orders);
    expect(summary.totalSales).toBe(500);
    expect(summary.staffTotal).toBe(300);
  });
});

describe('summarizeItemsSold', () => {
  it('folds quantities by product name across orders, sorted by qty desc', () => {
    const orders: Order[] = [
      makeOrder({ id: '1', items: [item('Cream Puff', 4, 150), item('Pastry', 2, 100)] }),
      makeOrder({ id: '2', items: [item('Cream Puff', 3, 150)] }),
    ];
    const result = summarizeItemsSold(orders);
    expect(result).toEqual([
      { productName: 'Cream Puff', qty: 7 },
      { productName: 'Pastry', qty: 2 },
    ]);
  });
});
