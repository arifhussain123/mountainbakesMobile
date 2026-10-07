jest.mock('@/common/database/repositories/offlineWriteRepository', () => ({ writeOffline: jest.fn() }));
jest.mock('@/api/sync/writeOutcome', () => ({ resolveWriteOutcome: jest.fn() }));
jest.mock('@/common/utils/image/returnPhoto', () => ({
  persistPhoto: jest.fn(),
  deletePersistedPhoto: jest.fn(),
}));

import React from 'react';
import { Text } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import { resolveWriteOutcome } from '@/api/sync/writeOutcome';
import { deletePersistedPhoto, persistPhoto } from '@/common/utils/image/returnPhoto';
import { useCreateStockReturn, type CreateStockReturnResult } from '@/api/hooks/useReturnsApi';
import { useAuthStore } from '@/state/authStore';
import { useSyncStore } from '@/state/syncStore';
import { renderScreen } from '@/common/test-utils/render';

const mockWriteOffline = writeOffline as jest.Mock;
const mockResolve = resolveWriteOutcome as jest.Mock;
const mockPersist = persistPhoto as jest.Mock;
const mockDeletePhoto = deletePersistedPhoto as jest.Mock;

/** As the picker hands it over: an optimised file in the app's CACHE. */
const PICKED = {
  uri: 'file:///cache/rn_image_picker_lib_temp_1.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 148_000,
  width: 1280,
  height: 960,
  originalBytes: 3_400_000,
};
const STORED_URI = 'file:///data/user/0/test/files/return-photos/abc.jpg';

/**
 * A stock return is the write most likely to be refused — a branch handing back
 * more units than it holds is the server's documented failure for this endpoint
 * — and it is offline-capable, so all three outcomes are reachable from one tap.
 *
 * What these pin: the queue entity and its payload, the transaction id, and that
 * a refusal is never dressed up as "on its way".
 */

const OPERATION_ID = '01a0116b-61c6-71ee-8038-5ce7ed3fd39a';

function Harness({
  onDone,
  onError,
}: {
  onDone: (r: CreateStockReturnResult) => void;
  onError?: (e: unknown) => void;
}) {
  const { createReturn } = useCreateStockReturn();
  return (
    <Text
      testID="go"
      onPress={() => {
        createReturn({
          items: [{ productId: 'p1', qty: 3 }],
          reason: 'Unsold at close',
          photo: PICKED,
        }).then(onDone, onError);
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
  mockPersist.mockResolvedValue(STORED_URI);
  mockDeletePhoto.mockResolvedValue(undefined);
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
      payload: {
        items: [{ productId: 'p1', qty: 3 }],
        reason: 'Unsold at close',
        attachmentIds: [],
        localPhoto: {
          uri: STORED_URI,
          mimeType: 'image/jpeg',
          width: 1280,
          height: 960,
          sizeBytes: 148_000,
        },
      },
    });
  });

  /**
   * The photo is queued, never uploaded at submit — online or not.
   *
   * What goes into the row is the path of a COPY in app storage: the picker's
   * own file lives in the cache directory, which Android may empty overnight,
   * and a return queued at close has to still have its picture in the morning.
   * `attachmentIds` is empty because the id does not exist yet; the drain fills
   * it in once the upload has happened.
   */
  it('stores the photo before queueing, and queues the stored copy', async () => {
    await submit();

    expect(mockPersist).toHaveBeenCalledWith(PICKED.uri, 'image/jpeg');
    expect(mockPersist.mock.invocationCallOrder[0]).toBeLessThan(
      mockWriteOffline.mock.invocationCallOrder[0]!,
    );

    const payload = mockWriteOffline.mock.calls[0][0].payload;
    expect(payload.localPhoto.uri).toBe(STORED_URI);
    expect(payload.localPhoto.uri).not.toBe(PICKED.uri);
    // A figure about the capture, not about the return: it stays on the device.
    expect(payload.localPhoto).not.toHaveProperty('originalBytes');
    expect(payload).not.toHaveProperty('photo');
  });

  it('queues nothing when the photo cannot be stored', async () => {
    // The photo is required, so a return without one is not a return. Failing
    // here, before the write, is what keeps a photo-less row out of the queue.
    mockPersist.mockRejectedValue(new Error('ENOSPC'));

    let error: unknown;
    const screen = await renderScreen(<Harness onDone={() => {}} onError={e => (error = e)} />);
    await fireEvent.press(screen.getByTestId('go'));
    await waitFor(() => expect(error).toBeDefined());

    expect(mockWriteOffline).not.toHaveBeenCalled();
  });

  it('removes the stored copy when the write itself fails', async () => {
    // No row points at the file, so nothing else would ever clean it up.
    mockWriteOffline.mockRejectedValue(new Error('database is locked'));

    let error: unknown;
    const screen = await renderScreen(<Harness onDone={() => {}} onError={e => (error = e)} />);
    await fireEvent.press(screen.getByTestId('go'));
    await waitFor(() => expect(error).toBeDefined());

    expect(mockDeletePhoto).toHaveBeenCalledWith(STORED_URI);
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
