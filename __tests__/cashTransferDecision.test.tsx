/**
 * @format
 */
import ReactTestRenderer from 'react-test-renderer';

const mockApprove = jest.fn();
const mockReject = jest.fn();
let mockKeySeq = 0;

jest.mock('@/api', () => ({
  generateIdempotencyKey: (prefix: string) => `${prefix}-${++mockKeySeq}`,
  isApiError: (e: unknown) => typeof e === 'object' && e !== null && 'status' in e && 'message' in e,
  useApproveFinanceCashTransfer: () => ({ mutateAsync: mockApprove }),
  useRejectFinanceCashTransfer: () => ({ mutateAsync: mockReject }),
}));
jest.mock('@/shared/helpers', () => ({ mapErrorToMessage: (e: { message?: string }) => e.message ?? String(e) }));

import { approvalPostings, useCashTransferDecision } from '@/features/finance/hooks/useCashTransferDecision';

// Same stand-in for a hook renderer as cashDepositIdempotency.test.tsx.
function renderDecision(id = 't1') {
  const ref: { current: ReturnType<typeof useCashTransferDecision> | null } = { current: null };
  function Harness() {
    ref.current = useCashTransferDecision(id);
    return null;
  }
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Harness />);
  });
  return ref;
}

describe('useCashTransferDecision — a decision is sent once', () => {
  beforeEach(() => {
    mockApprove.mockReset();
    mockReject.mockReset();
  });

  it('a second tap while the first approval is in flight sends nothing', async () => {
    let resolve!: () => void;
    mockApprove.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const ref = renderDecision();

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    await ReactTestRenderer.act(async () => {
      first = ref.current!.approve();
      second = ref.current!.approve();
    });
    expect(await second).toEqual({ kind: 'busy' });
    await ReactTestRenderer.act(async () => resolve());
    expect(await first).toEqual({ kind: 'done', decision: 'approved' });
    expect(mockApprove).toHaveBeenCalledTimes(1);
  });

  it('a retry after a failure reuses the same idempotency key', async () => {
    mockApprove.mockRejectedValueOnce({ status: null, message: 'No internet connection.' }).mockResolvedValueOnce({});
    const ref = renderDecision();

    let outcome: unknown;
    await ReactTestRenderer.act(async () => {
      outcome = await ref.current!.approve('  checked  ');
    });
    expect(outcome).toEqual({ kind: 'failed', message: 'No internet connection.' });
    await ReactTestRenderer.act(async () => {
      outcome = await ref.current!.approve('checked');
    });
    expect(outcome).toEqual({ kind: 'done', decision: 'approved' });

    const [a, b] = mockApprove.mock.calls.map((c) => c[0]);
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a).toEqual({ id: 't1', input: { note: 'checked' }, idempotencyKey: a.idempotencyKey });
  });

  it('"already approved by someone else" (409) is its own outcome, not a failure', async () => {
    mockApprove.mockRejectedValue({ status: 409, message: 'Transfer CT-000057 is already approved and cannot be approved again.' });
    const ref = renderDecision();
    let outcome: unknown;
    await ReactTestRenderer.act(async () => {
      outcome = await ref.current!.approve();
    });
    expect(outcome).toEqual({ kind: 'already-decided', message: 'Transfer CT-000057 is already approved and cannot be approved again.' });
  });

  it('reject sends the trimmed reason under its own key', async () => {
    mockReject.mockResolvedValue({});
    const ref = renderDecision();
    await ReactTestRenderer.act(async () => {
      await ref.current!.reject('  photo does not match  ');
    });
    const call = mockReject.mock.calls[0][0];
    expect(call.input).toEqual({ reason: 'photo does not match' });
    expect(call.idempotencyKey).toMatch(/^finance_cash_transfer_reject-/);
  });
});

describe('approvalPostings — what the confirmation says will be posted', () => {
  it('one RV for the Total, a second for fuel', () => {
    expect(approvalPostings({ amount: 23720, fuelCharges: 300 })).toEqual([
      { head: 'Company Share', code: 'INC-COMPANY-SHARE', amount: 23720 },
      { head: 'Fuel', code: 'INC-FUEL', amount: 300 },
    ]);
  });

  it('no fuel voucher when there is no fuel', () => {
    expect(approvalPostings({ amount: 4360, fuelCharges: 0 })).toEqual([{ head: 'Company Share', code: 'INC-COMPANY-SHARE', amount: 4360 }]);
  });
});
