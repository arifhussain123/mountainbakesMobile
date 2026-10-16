/**
 * @format
 */
import ReactTestRenderer from 'react-test-renderer';

const mockMutateAsync = jest.fn();

jest.mock('@/api', () => ({
  generateIdempotencyKey: (prefix: string) => `${prefix}-fixed-test-key`,
  isApiError: (e: unknown) => typeof e === 'object' && e !== null && 'status' in e,
  lookupSupportReference: jest.fn(),
  useCreateSupportTicket: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useSupportTickets: () => ({ data: { tickets: [] } }),
}));

jest.mock('@/shared/helpers', () => ({ mapErrorToMessage: (e: unknown) => String(e) }));
jest.mock('@/shared/hooks', () => ({ useNetworkStatus: () => ({ isOffline: false }) }));

import { useNewQueryForm } from '@/features/support/hooks/useNewQueryForm';

// Same minimal hook-test harness as `cashDepositIdempotency.test.tsx` — no
// `@testing-library/react-hooks` in this repo, so a throwaway component
// exposes the hook's return value on a mutable ref.
function renderNewQueryForm() {
  const ref: { current: ReturnType<typeof useNewQueryForm> | null } = { current: null };
  function Harness() {
    ref.current = useNewQueryForm();
    return null;
  }
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Harness />);
  });
  return ref;
}

const VALID_MESSAGE = 'The amount on this expense looks wrong';

describe('useNewQueryForm — idempotent submission', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
  });

  it('reuses the same idempotency key across repeated submit() calls (a retry never mints a new one)', async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    const ref = renderNewQueryForm();

    await ReactTestRenderer.act(async () => {
      ref.current!.setReferenceId('EXP-000012');
      ref.current!.setMessage(VALID_MESSAGE);
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
    expect(firstKey).toBe('support_ticket-fixed-test-key');
  });

  it('a failed submit can be retried and still carries the original key', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('network down'));
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const ref = renderNewQueryForm();

    await ReactTestRenderer.act(async () => {
      ref.current!.setReferenceId('EXP-000012');
      ref.current!.setMessage(VALID_MESSAGE);
    });

    let firstResult!: boolean;
    await ReactTestRenderer.act(async () => {
      firstResult = await ref.current!.submit();
    });
    expect(firstResult).toBe(false);

    let secondResult!: boolean;
    await ReactTestRenderer.act(async () => {
      secondResult = await ref.current!.submit();
    });
    expect(secondResult).toBe(true);

    const keys = mockMutateAsync.mock.calls.map((call) => call[0].idempotencyKey);
    expect(keys[0]).toBe(keys[1]);
  });

  it('never calls submit (and so never touches the network) while the reference ID or message is invalid', async () => {
    const ref = renderNewQueryForm();

    await ReactTestRenderer.act(async () => {
      ref.current!.setReferenceId('not-a-real-id');
      ref.current!.setMessage(VALID_MESSAGE);
    });
    let result!: boolean;
    await ReactTestRenderer.act(async () => {
      result = await ref.current!.submit();
    });
    expect(result).toBe(false);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
