jest.mock('@/common/database/repositories/offlineWriteRepository', () => ({ writeOffline: jest.fn() }));
jest.mock('@/api/sync/writeOutcome', () => ({ resolveWriteOutcome: jest.fn() }));

import React from 'react';
import { Text } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import { resolveWriteOutcome } from '@/api/sync/writeOutcome';
import { useCreateStockReturn, type CreateStockReturnResult } from '@/api/hooks/useReturnsApi';
import { useAuthStore } from '@/state/authStore';
import { useSyncStore } from '@/state/syncStore';
import { renderScreen } from '@/common/test-utils/render';

const mockWriteOffline = writeOffline as jest.Mock;
const mockResolve = resolveWriteOutcome as jest.Mock;

/**
 * A stock return is the write most likely to be refused — a branch handing back
 * more units than it holds is the server's documented failure for this endpoint
 * — and it is offline-capable, so all three outcomes are reachable from one tap.
 *
 * What these pin: the queue entity and its payload, the transaction id, and that
 * a refusal is never dressed up as "on its way".
 */

const OPERATION_ID = '01a0116b-61c6-71ee-8038-5ce7ed3fd39a';

function Harness({ onDone }: { onDone: (r: CreateStockReturnResult) => void }) {
  const { createReturn } = useCreateStockReturn();
  return (
    <Text
      testID="go"
      onPress={() => {
        createReturn({ items: [{ productId: 'p1', qty: 3 }], reason: 'Unsold at close' }).then(
          onDone,
        );
      }}>
      go
    </Text>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWriteOffline.mockResolvedValue({
    clientOperationId: OPERATION_ID,
    businessDate: '2026-08-19',
    queued: true,
  });
  mockResolve.mockResolvedValue({ outcome: 'synced' });
  useSyncStore.setState({ lastResult: null, phase: 'idle', pending: 0, needsAttention: 0 });
  useAuthStore.setState({
    status: 'signedIn',
    claims: {
      userId: 'u1',
      email: 'a@b.com',
      role: 'branch_manager',
      branchId: 'b-1',
      branchName: 'Saddar',
      mustChangePassword: false,
    },
  });
});

async function submit() {
  let result: CreateStockReturnResult | undefined;
  const screen = await renderScreen(<Harness onDone={r => (result = r)} />);
  await fireEvent.press(screen.getByTestId('go'));
  await waitFor(() => expect(result).toBeDefined());
  return result as CreateStockReturnResult;
}

describe('returning stock', () => {
  it('writes through the offline path as a stock movement', async () => {
    await submit();

    // The queue entity decides the endpoint: `stock_movement` is mapped to
    // POST /api/stock/return in services/sync/endpoints.ts.
    expect(mockWriteOffline).toHaveBeenCalledWith({
      entity: 'stock_movement',
      branchId: 'b-1',
      payload: { items: [{ productId: 'p1', qty: 3 }], reason: 'Unsold at close' },
    });
  });

  /**
   * The id is minted when the return is CREATED, and it is the same value the
   * queue row and the `Idempotency-Key` header carry. It is also the only
   * identifier a queued return has — no server reference exists for it yet.
   */
  it('returns the operation id as the transaction identifier', async () => {
    const result = await submit();
    expect(result.clientOperationId).toBe(OPERATION_ID);
    expect(result.businessDate).toBe('2026-08-19');
  });

  it('says queued when the server has not seen it, and moves no stock', async () => {
    mockResolve.mockResolvedValue({ outcome: 'queued' });

    const result = await submit();
    expect(result.outcome).toBe('queued');
  });

  /**
   * The case this endpoint actually fails on. A refusal never clears by waiting,
   * so reporting it as queued would leave a branch believing the units are on
   * their way back to production when the shelf still holds them.
   */
  it('says refused, with the reason, rather than pretending it is queued', async () => {
    mockResolve.mockResolvedValue({
      outcome: 'refused',
      reason: 'Only 1 unit of Plain Donuts on hand',
    });

    const result = await submit();
    expect(result.outcome).toBe('refused');
    expect(result.reason).toBe('Only 1 unit of Plain Donuts on hand');
  });

  it('reads the row rather than the drain tally', async () => {
    // A busy queue can sync three other rows while this one is refused.
    useSyncStore.setState({
      lastResult: { synced: 3, failed: 0, conflicts: 1, remaining: 0, stoppedBecause: 'completed' },
    });
    mockResolve.mockResolvedValue({ outcome: 'refused', reason: 'Not enough stock' });

    const result = await submit();
    expect(result.outcome).toBe('refused');
    expect(mockResolve).toHaveBeenCalledWith(OPERATION_ID);
  });
});
