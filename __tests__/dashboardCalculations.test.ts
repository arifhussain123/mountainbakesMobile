/**
 * @format
 */
import {
  barScalePct,
  completedOrders,
  computeStockEndDifference,
  computeStockHistoryRetAdj,
  orderCompletionPct,
  sharePct,
} from '@/features/dashboard/calculations';
import type { BranchStockHistoryRow } from '@/api';

describe('sharePct', () => {
  it('computes part as a percentage of whole', () => {
    expect(sharePct(2370, 34050)).toBeCloseTo(6.9603, 3);
  });

  it('returns null (not 0) when whole is zero — no fabricated percentage', () => {
    expect(sharePct(100, 0)).toBeNull();
  });

  it('returns null when whole is negative', () => {
    expect(sharePct(100, -5)).toBeNull();
  });
});

describe('barScalePct', () => {
  it('scales a value against the shared max', () => {
    expect(barScalePct(50, 200)).toBe(25);
  });

  it('clamps at 100 when value exceeds max', () => {
    expect(barScalePct(300, 200)).toBe(100);
  });

  it('returns 0 for a non-positive value', () => {
    expect(barScalePct(0, 200)).toBe(0);
    expect(barScalePct(-10, 200)).toBe(0);
  });

  it('returns 0 for a non-positive max', () => {
    expect(barScalePct(50, 0)).toBe(0);
  });
});

describe('completedOrders / orderCompletionPct', () => {
  it('subtracts pending and cancelled from the total', () => {
    expect(completedOrders(43, 0, 0)).toBe(43);
    expect(completedOrders(43, 2, 1)).toBe(40);
  });

  it('never goes negative when pending+cancelled exceeds total', () => {
    expect(completedOrders(5, 4, 4)).toBe(0);
  });

  it('computes the donut percentage from completed/total', () => {
    expect(orderCompletionPct(43, 0, 0)).toBe(100);
    expect(orderCompletionPct(40, 2, 1)).toBeCloseTo((37 / 40) * 100, 5);
  });

  it('returns null (not 0%) when there are no orders yet', () => {
    expect(orderCompletionPct(0, 0, 0)).toBeNull();
  });
});

function row(overrides: Partial<BranchStockHistoryRow> = {}): BranchStockHistoryRow {
  return {
    date: '2026-10-16',
    openingQty: 66,
    openingAmount: 19_600,
    newQty: 0,
    newAmount: 0,
    soldQty: 0,
    soldAmount: 0,
    returnedQty: 0,
    returnedAmount: 0,
    adjustmentQty: 0,
    adjustmentAmount: 0,
    balanceQty: 66,
    balanceAmount: 19_600,
    ...overrides,
  };
}

describe('computeStockEndDifference', () => {
  it('is zero when opening + new - sold - returned + adjustment equals the balance', () => {
    const result = computeStockEndDifference(row());
    expect(result).toEqual({ qty: 0, amount: 0, isZero: true });
  });

  it('is zero across a day with real movement that nets out correctly', () => {
    const result = computeStockEndDifference(
      row({ newQty: 20, newAmount: 5_600, soldQty: 15, soldAmount: 4_200, balanceQty: 71, balanceAmount: 21_000 }),
    );
    expect(result.isZero).toBe(true);
  });

  it('reports a non-zero qty difference when the counted balance disagrees with the expected one', () => {
    // Expected remaining is 66 + 20 - 15 = 71, but the statement's balance says 68 — a 3-unit shrink.
    const result = computeStockEndDifference(row({ newQty: 20, soldQty: 15, balanceQty: 68 }));
    expect(result.qty).toBe(3);
    expect(result.isZero).toBe(false);
  });

  it('reports a non-zero amount difference independently of the qty difference', () => {
    const result = computeStockEndDifference(row({ balanceAmount: 19_000 }));
    expect(result.qty).toBe(0);
    expect(result.amount).toBe(600);
    expect(result.isZero).toBe(false);
  });
});

describe('computeStockHistoryRetAdj', () => {
  it('14 Oct reference: returned 7, adjustment 0 -> RET/ADJ is -7, not +7', () => {
    // 47 + 167 - 137 - 7 = 70 — the balance only works out with a signed -7.
    const r = row({ openingQty: 47, newQty: 167, soldQty: 137, returnedQty: 7, adjustmentQty: 0, balanceQty: 70 });
    expect(computeStockHistoryRetAdj(r)).toBe(-7);
    expect(computeStockEndDifference(r).qty).toBe(0);
  });

  it('12 Oct reference: a pure adjustment of -7 (no returns) also nets to -7', () => {
    const r = row({ openingQty: 40, newQty: 50, soldQty: 20, returnedQty: 0, adjustmentQty: -7, balanceQty: 63 });
    expect(computeStockHistoryRetAdj(r)).toBe(-7);
    expect(computeStockEndDifference(r).qty).toBe(0);
  });

  it('is net positive when adjustment outweighs returns', () => {
    const r = row({ openingQty: 10, newQty: 10, soldQty: 5, returnedQty: 2, adjustmentQty: 5, balanceQty: 18 });
    expect(computeStockHistoryRetAdj(r)).toBe(3);
    expect(computeStockEndDifference(r).qty).toBe(0);
  });

  it('is zero when returns and adjustment cancel out', () => {
    const r = row({ returnedQty: 4, adjustmentQty: 4 });
    expect(computeStockHistoryRetAdj(r)).toBe(0);
  });

  describe('every card satisfies Prev + New - Sold + RetAdj = Left', () => {
    const cases: Partial<BranchStockHistoryRow>[] = [
      { openingQty: 47, newQty: 167, soldQty: 137, returnedQty: 7, adjustmentQty: 0, balanceQty: 70 },
      { openingQty: 40, newQty: 50, soldQty: 20, returnedQty: 0, adjustmentQty: -7, balanceQty: 63 },
      { openingQty: 66, newQty: 154, soldQty: 150, returnedQty: 1, adjustmentQty: 0, balanceQty: 69 },
      { openingQty: 10, newQty: 10, soldQty: 5, returnedQty: 2, adjustmentQty: 5, balanceQty: 18 },
    ];

    it.each(cases)('reconciles for %o', (overrides) => {
      const r = row(overrides);
      const retAdj = computeStockHistoryRetAdj(r);
      expect(r.openingQty + r.newQty - r.soldQty + retAdj).toBe(r.balanceQty);
    });
  });
});
