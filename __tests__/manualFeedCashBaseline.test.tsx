/**
 * @format
 */
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@/api', () => ({
  useFeedDailySaleRecord: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useGenerateDailySaleRecord: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock('@/shared/helpers', () => ({ mapErrorToMessage: (e: unknown) => String(e) }));

import { useManualFeedForm } from '@/features/closing/hooks/useManualFeedForm';
import type { DailySaleRecord } from '@/api';

function renderManualFeedForm(record: DailySaleRecord | null) {
  const ref: { current: ReturnType<typeof useManualFeedForm> | null } = { current: null };
  function Harness() {
    ref.current = useManualFeedForm('2026-10-15', record, []);
    return null;
  }
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Harness />);
  });
  return ref;
}

function makeRecord(overrides: Partial<DailySaleRecord>): DailySaleRecord {
  return {
    id: 'rec-1',
    branchId: 'branch-1',
    branchName: 'Committee Chowk',
    businessDate: '2026-10-15',
    autoTotalSale: 46650,
    companySharePct: 75,
    companyShare: 34987.5,
    branchSharePct: 25,
    branchShare: 11662.5,
    autoCash: 37100,
    autoEasypaisa: 9550,
    autoFoodpanda: 0,
    autoBank: 0,
    autoOther: 0,
    autoStaff: 0,
    discount: 900,
    cashExpense: 300,
    expenseTotal: 300,
    orderCount: 12,
    generatedAt: '2026-10-16T00:03:00Z',
    manualCash: null,
    manualEasypaisa: null,
    manualBank: null,
    fedBy: null,
    fedByName: null,
    fedAt: null,
    cashDifference: null,
    easypaisaDifference: null,
    bankDifference: null,
    overallDifference: 0,
    paymentTotal: 46650,
    expectedCashInHand: 36800,
    status: 'open',
    verifiedBy: null,
    verifiedByName: null,
    verifiedAt: null,
    ...overrides,
  };
}

describe('useManualFeedForm — cash live-difference baseline', () => {
  it('compares a counted cash amount against Cash on Table, not gross auto cash', () => {
    // Reference scenario: auto cash 37,100, cash expense 300 -> Cash on Table 36,800.
    const record = makeRecord({});
    const ref = renderManualFeedForm(record);

    expect(ref.current!.autoValues.cash).toBe(36800);

    ReactTestRenderer.act(() => {
      ref.current!.setInput('cash', '36800');
    });
    // Counting exactly what's on the table should read as matched, not "short by the expense amount".
    expect(ref.current!.liveDifference('cash')).toBe(0);
  });

  it('does not falsely flag a large difference on a day with a big cash expense but an accurate count', () => {
    // 15-10 reference shape: a large cash expense drags Cash on Table down,
    // but counting exactly the (lower) Cash on Table figure is still a perfect count.
    const record = makeRecord({ autoCash: 37750, cashExpense: 22370, expectedCashInHand: 15380 });
    const ref = renderManualFeedForm(record);

    ReactTestRenderer.act(() => {
      ref.current!.setInput('cash', '15380');
    });

    expect(ref.current!.liveDifference('cash')).toBe(0);
    expect(ref.current!.hasLargeDifference).toBe(false);
  });

  it('still nets Easypaisa/Bank against the gross system figure, not Cash on Table', () => {
    const record = makeRecord({});
    const ref = renderManualFeedForm(record);
    expect(ref.current!.autoValues.easypaisa).toBe(9550);
    expect(ref.current!.autoValues.bank).toBe(0);
  });
});
