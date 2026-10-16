/**
 * @format
 */
import ReactTestRenderer from 'react-test-renderer';

const mockMutateAsync = jest.fn();

jest.mock('@/api', () => ({
  getBusinessDate: () => '2026-10-16',
  generateIdempotencyKey: (prefix: string) => `${prefix}-fixed-test-key`,
  uploadAttachment: jest.fn(),
  discardAttachment: jest.fn(),
  useCreateCashTransfer: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useDailySaleRecords: () => ({ data: undefined, isLoading: false }),
  useCashTransfers: () => ({ data: undefined, isLoading: false }),
}));

jest.mock('@/shared/helpers', () => ({ mapErrorToMessage: (e: unknown) => String(e) }));
jest.mock('@/shared/utils', () => ({ formatCurrency: (n: number) => `Rs. ${n}` }));
jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));

import { useCashDepositForm } from '@/features/cash/hooks/useCashDepositForm';

// A minimal stand-in for `@testing-library/react-hooks` (not installed in
// this repo) — a component that calls the hook and exposes its return value
// on a mutable ref, so the hook's behavior is testable without rendering any
// real screen UI. Same reasoning as `writeQueue.test.ts`'s injected fakes:
// test the hook's own logic, not the native chrome around it.
function renderCashDepositForm() {
  const ref: { current: ReturnType<typeof useCashDepositForm> | null } = { current: null };
  function Harness() {
    ref.current = useCashDepositForm();
    return null;
  }
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Harness />);
  });
  return ref;
}

describe('useCashDepositForm — idempotent submission', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
  });

  it('reuses the same idempotency key across repeated submit() calls (a retry never mints a new one)', async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    const ref = renderCashDepositForm();

    // Fuel-only (no cash/easypaisa/bank) — `photoRequired` is false in this
    // case (only non-fuel amounts require a photo), so submit() can proceed
    // without stubbing the photo-picker flow too.
    await ReactTestRenderer.act(async () => {
      ref.current!.setFuelInput('300');
    });

    await ReactTestRenderer.act(async () => {
      await ref.current!.submit();
    });
    await ReactTestRenderer.act(async () => {
      await ref.current!.submit();
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    const firstKey = mockMutateAsync.mock.calls[0][0].idempotencyKey;
    const secondKey = mockMutateAsync.mock.calls[1][0].idempotencyKey;
    expect(firstKey).toBe(secondKey);
    expect(firstKey).toBe('cash_transfer-fixed-test-key');
  });

  it('a failed submit can be retried and still carries the original key', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('network down'));
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const ref = renderCashDepositForm();

    await ReactTestRenderer.act(async () => {
      ref.current!.setFuelInput('250');
    });

    let firstResult!: boolean;
    await ReactTestRenderer.act(async () => {
      firstResult = await ref.current!.submit();
    });
    expect(firstResult).toBe(false);
    expect(ref.current!.submitError).toBe('Error: network down');

    let secondResult!: boolean;
    await ReactTestRenderer.act(async () => {
      secondResult = await ref.current!.submit();
    });
    expect(secondResult).toBe(true);

    const keys = mockMutateAsync.mock.calls.map((call) => call[0].idempotencyKey);
    expect(keys[0]).toBe(keys[1]);
  });
});
