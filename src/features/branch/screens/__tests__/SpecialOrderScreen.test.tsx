import React from 'react';
import { useWindowDimensions } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');
jest.mock('@/api/services/catalogService', () => ({
  getProducts: jest.fn(),
  getCategories: jest.fn(),
  getSettings: jest.fn(),
  getBranches: jest.fn(),
  getStock: jest.fn(),
}));
jest.mock('@/common/database/repositories/offlineWriteRepository', () => ({
  writeOffline: jest.fn(),
}));
jest.mock('@/api/sync/syncManager', () => ({
  drainQueue: jest.fn(),
  isDraining: () => false,
}));
jest.mock('@/common/database/repositories/syncQueueRepository', () => ({
  getUnsyncedSummary: jest.fn(async () => ({
    total: 0,
    pending: 0,
    needsAttention: 0,
  })),
  // What the write hook reads to decide what the branch is told: this row's
  // fate, not the drain's tally.
  getOperationOutcome: jest.fn(async () => ({ status: 'synced', message: null })),
}));

import * as catalogApi from '@/api/services/catalogService';
import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import { getOperationOutcome } from '@/common/database/repositories/syncQueueRepository';
import { drainQueue } from '@/api/sync/syncManager';
import { CreateSpecialOrderSchema } from '@/shared';
import { useAuthStore } from '@/state/authStore';
import { useSyncStore } from '@/state/syncStore';
import { renderScreen } from '@/common/test-utils/render';
import { SpecialOrderScreen } from '../SpecialOrderScreen';

const mockDimensions = useWindowDimensions as unknown as jest.Mock;
const mockWriteOffline = writeOffline as jest.Mock;
const mockDrain = drainQueue as jest.Mock;
const mockOutcome = getOperationOutcome as jest.Mock;

/**
 * A narrow phone by default — 360dp is the width the row layout is written
 * for, and Jest's own default window is wide enough to be a tablet.
 */
function atWidth(width: number) {
  mockDimensions.mockReturnValue({ width, height: 800, scale: 2, fontScale: 1 });
}

beforeEach(() => {
  jest.clearAllMocks();
  atWidth(360);
  (catalogApi.getSettings as jest.Mock).mockResolvedValue({ currencySymbol: 'Rs.' });
  mockWriteOffline.mockResolvedValue({
    clientOperationId: '01a0116b-61c6-71ee-8038-5ce7ed3fd39a',
    businessDate: '2026-08-18',
    queued: true,
  });
  drainSyncs(1);
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

/** The drain reached the server, or it did not — the row is what decides. */
function drainSyncs(count: number) {
  mockDrain.mockResolvedValue({
    synced: count,
    failed: 0,
    conflicts: 0,
    remaining: count > 0 ? 0 : 1,
    stoppedBecause: count > 0 ? 'completed' : 'offline',
  });
  mockOutcome.mockResolvedValue(
    count > 0 ? { status: 'synced', message: null } : { status: 'pending', message: null },
  );
}

/** The server judged it and said no: a parked row that never clears by waiting. */
function drainRefuses(message: string) {
  mockDrain.mockResolvedValue({
    synced: 0,
    failed: 1,
    conflicts: 0,
    remaining: 1,
    stoppedBecause: 'completed',
  });
  mockOutcome.mockResolvedValue({ status: 'failed', message });
}

type Screen = Awaited<ReturnType<typeof renderScreen>>;

async function show(): Promise<Screen> {
  const screen = await renderScreen(<SpecialOrderScreen />);
  await waitFor(() => expect(screen.getByTestId('special-order-name-0')).toBeTruthy());
  return screen;
}

async function fillRow(
  screen: Screen,
  index: number,
  values: { name?: string; qty?: string; amount?: string; description?: string },
): Promise<void> {
  for (const [field, value] of Object.entries(values)) {
    await fireEvent.changeText(screen.getByTestId(`special-order-${field}-${index}`), value);
  }
}

async function submit(screen: Screen): Promise<void> {
  await fireEvent.press(screen.getByTestId('special-order-submit'));
}

/** Every testID in the rendered tree, in the order it is drawn and read. */
function testIdsInOrder(screen: Screen): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const { props, children } = node as { props?: { testID?: string }; children?: unknown };
    if (props?.testID) found.push(props.testID);
    walk(children);
  };
  walk(screen.toJSON());
  return found;
}

function rowControls(screen: Screen, index: number): string[] {
  const wanted = ['name', 'qty', 'amount', 'delete'].map(
    part => `special-order-${part}-${index}`,
  );
  return testIdsInOrder(screen).filter(id => wanted.includes(id));
}

describe('SpecialOrderScreen', () => {
  it('names itself and says it is not a demand', async () => {
    const screen = await show();

    expect(screen.getByText('Special Order')).toBeTruthy();
    expect(
      screen.getByText('Goes straight to Production. This is separate from a demand.'),
    ).toBeTruthy();
  });

  /**
   * Amount sits between Qty and Delete. The order is asserted on the tree
   * because that is also the focus and the screen-reader order.
   */
  it('lays a row out as Item Name, Qty, Amount, Delete', async () => {
    const screen = await show();

    expect(rowControls(screen, 0)).toEqual([
      'special-order-name-0',
      'special-order-qty-0',
      'special-order-amount-0',
      'special-order-delete-0',
    ]);
    // By the field's own accessible name: the visible label carries a required
    // mark, so it is not the bare word.
    expect(screen.getByLabelText('Item Name')).toBeTruthy();
    expect(screen.getByLabelText('Qty')).toBeTruthy();
    expect(screen.getByLabelText('Amount')).toBeTruthy();
    expect(screen.getByLabelText('Delete row 1')).toBeTruthy();
    expect(screen.getByTestId('special-order-description-0')).toBeTruthy();
  });

  it('keeps the same order on a wide window, where all four share a line', async () => {
    atWidth(800);
    const screen = await show();

    expect(rowControls(screen, 0)).toEqual([
      'special-order-name-0',
      'special-order-qty-0',
      'special-order-amount-0',
      'special-order-delete-0',
    ]);
  });

  /** Nothing on this screen is picked from the catalogue or checked against it. */
  it('offers no stock control', async () => {
    const screen = await show();

    expect(screen.queryByText(/stock/i)).toBeNull();
    expect(catalogApi.getStock).not.toHaveBeenCalled();
    expect(catalogApi.getProducts).not.toHaveBeenCalled();
  });

  describe('validation', () => {
    it('asks for the item name', async () => {
      const screen = await show();

      await fillRow(screen, 0, { qty: '2', amount: '1500' });
      await submit(screen);

      await waitFor(() => expect(screen.getByText('Please enter the item name.')).toBeTruthy());
      expect(screen.queryByText('Please enter quantity.')).toBeNull();
      expect(screen.queryByText('Please enter the Special Order amount.')).toBeNull();
      expect(mockWriteOffline).not.toHaveBeenCalled();
    });

    it.each([
      ['left empty', ''],
      ['zero', '0'],
      ['a fraction', '1.5'],
      ['negative', '-2'],
      ['not a number', 'two'],
    ])('asks for the quantity when it is %s', async (_label, qty) => {
      const screen = await show();

      await fillRow(screen, 0, { name: 'Birthday cake', qty, amount: '1500' });
      await submit(screen);

      await waitFor(() => expect(screen.getByText('Please enter quantity.')).toBeTruthy());
      expect(mockWriteOffline).not.toHaveBeenCalled();
    });

    it.each([
      ['left empty', ''],
      ['negative', '-1'],
      ['not a number', 'free'],
      ['given three decimals', '10.125'],
    ])('asks for the amount when it is %s', async (_label, amount) => {
      const screen = await show();

      await fillRow(screen, 0, { name: 'Birthday cake', qty: '1', amount });
      await submit(screen);

      await waitFor(() =>
        expect(screen.getByText('Please enter the Special Order amount.')).toBeTruthy(),
      );
      expect(mockWriteOffline).not.toHaveBeenCalled();
    });

    /**
     * A replacement made free of charge is a real Special Order. The check is
     * "a number was entered", and a truthiness test would refuse this one.
     */
    it('accepts an amount of 0', async () => {
      const screen = await show();

      await fillRow(screen, 0, { name: 'Replacement cake', qty: '1', amount: '0' });
      await submit(screen);

      await waitFor(() => expect(mockWriteOffline).toHaveBeenCalledTimes(1));
      expect(mockWriteOffline.mock.calls[0][0].payload.items[0].amount).toBe(0);
      expect(screen.queryByText('Please enter the Special Order amount.')).toBeNull();
    });

    it('ignores a row nobody typed into', async () => {
      const screen = await show();

      await fillRow(screen, 0, { name: 'Birthday cake', qty: '1', amount: '2500' });
      await fireEvent.press(screen.getByTestId('special-order-add-row'));
      await waitFor(() => expect(screen.getByTestId('special-order-name-1')).toBeTruthy());
      await submit(screen);

      await waitFor(() => expect(mockWriteOffline).toHaveBeenCalledTimes(1));
      expect(mockWriteOffline.mock.calls[0][0].payload.items).toHaveLength(1);
    });

    /** One bad row holds the whole order back — nothing is sent in part. */
    it('queues nothing while any started row is incomplete', async () => {
      const screen = await show();

      await fillRow(screen, 0, { name: 'Birthday cake', qty: '1', amount: '2500' });
      await fireEvent.press(screen.getByTestId('special-order-add-row'));
      await waitFor(() => expect(screen.getByTestId('special-order-name-1')).toBeTruthy());
      await fillRow(screen, 1, { description: 'Blue icing' });
      await submit(screen);

      await waitFor(() => expect(screen.getByText('Please enter the item name.')).toBeTruthy());
      expect(screen.getByText('Please enter quantity.')).toBeTruthy();
      expect(screen.getByText('Please enter the Special Order amount.')).toBeTruthy();
      expect(mockWriteOffline).not.toHaveBeenCalled();
      expect(mockDrain).not.toHaveBeenCalled();
    });

    it('refuses an order with no rows filled in at all', async () => {
      const screen = await show();

      await submit(screen);

      await waitFor(() =>
        expect(screen.getByText('Add at least one Special Order item')).toBeTruthy(),
      );
      expect(mockWriteOffline).not.toHaveBeenCalled();
    });

    /**
     * Past the row checks but not past the server's schema: an amount the
     * column cannot hold must not be queued to be refused hours later.
     */
    it('does not queue a payload the server schema would refuse', async () => {
      const screen = await show();

      await fillRow(screen, 0, { name: 'Wedding cake', qty: '1', amount: '100000000' });
      await submit(screen);

      await waitFor(() =>
        expect(screen.getByText('The Special Order amount is too large')).toBeTruthy(),
      );
      expect(mockWriteOffline).not.toHaveBeenCalled();
    });
  });

  describe('what is queued', () => {
    it('sends every row with its own amount, and nothing else', async () => {
      const screen = await show();

      await fillRow(screen, 0, {
        name: '  Birthday cake ',
        qty: '3',
        amount: '1500',
        description: ' Blue icing ',
      });
      await fireEvent.press(screen.getByTestId('special-order-add-row'));
      await waitFor(() => expect(screen.getByTestId('special-order-name-1')).toBeTruthy());
      await fillRow(screen, 1, { name: 'Cupcake tower', qty: '1', amount: '249.5' });
      await submit(screen);

      await waitFor(() => expect(mockWriteOffline).toHaveBeenCalledTimes(1));
      const written = mockWriteOffline.mock.calls[0][0];

      expect(written.entity).toBe('special_order');
      // The local scope, never part of what is sent.
      expect(written.branchId).toBe('b-1');
      expect(written.payload).toEqual({
        items: [
          // 1500 for the row of three — never 4500.
          { name: 'Birthday cake', qty: 3, amount: 1500, description: 'Blue icing', attachmentIds: [] },
          { name: 'Cupcake tower', qty: 1, amount: 249.5, description: '', attachmentIds: [] },
        ],
      });
      expect(written.payload).not.toHaveProperty('branchId');
      expect(written.payload).not.toHaveProperty('specialItems');
    });

    it('queues a payload the server schema accepts', async () => {
      const screen = await show();

      await fillRow(screen, 0, { name: 'Birthday cake', qty: '3', amount: '1500.50' });
      await submit(screen);

      await waitFor(() => expect(mockWriteOffline).toHaveBeenCalledTimes(1));
      const payload = mockWriteOffline.mock.calls[0][0].payload;
      expect(CreateSpecialOrderSchema.safeParse(payload).success).toBe(true);
      // And still does once the drain has merged the device's business date in.
      expect(
        CreateSpecialOrderSchema.safeParse({ ...payload, businessDate: '2026-08-18' }).success,
      ).toBe(true);
    });

    it('drops a deleted row from the order', async () => {
      const screen = await show();

      await fillRow(screen, 0, { name: 'Birthday cake', qty: '1', amount: '2500' });
      await fireEvent.press(screen.getByTestId('special-order-add-row'));
      await waitFor(() => expect(screen.getByTestId('special-order-name-1')).toBeTruthy());
      await fillRow(screen, 1, { name: 'Cupcake tower', qty: '2', amount: '900' });

      await fireEvent.press(screen.getByTestId('special-order-delete-0'));
      await waitFor(() => expect(screen.queryByTestId('special-order-name-1')).toBeNull());
      await submit(screen);

      await waitFor(() => expect(mockWriteOffline).toHaveBeenCalledTimes(1));
      expect(mockWriteOffline.mock.calls[0][0].payload.items).toEqual([
        { name: 'Cupcake tower', qty: 2, amount: 900, description: '', attachmentIds: [] },
      ]);
    });
  });

  describe('total', () => {
    /** The plain sum of the amounts: quantity plays no part in it. */
    it('is the sum of the row amounts', async () => {
      const screen = await show();

      await fillRow(screen, 0, { name: 'Birthday cake', qty: '3', amount: '1500' });
      await fireEvent.press(screen.getByTestId('special-order-add-row'));
      await waitFor(() => expect(screen.getByTestId('special-order-name-1')).toBeTruthy());
      await fillRow(screen, 1, { name: 'Cupcake tower', qty: '2', amount: '249.5' });

      await waitFor(() =>
        expect(screen.getByTestId('special-order-total')).toHaveTextContent('Rs. 1,749.5'),
      );
      expect(screen.getByText('Special Order total')).toBeTruthy();
    });

    it('is not shown once there are no rows', async () => {
      const screen = await show();

      await fireEvent.press(screen.getByTestId('special-order-delete-0'));

      await waitFor(() => expect(screen.queryByTestId('special-order-total')).toBeNull());
      expect(screen.queryByText('Special Order total')).toBeNull();
    });
  });

  describe('outcome', () => {
    async function send(screen: Screen): Promise<void> {
      await fillRow(screen, 0, { name: 'Birthday cake', qty: '1', amount: '2500' });
      await submit(screen);
      await waitFor(() => expect(mockWriteOffline).toHaveBeenCalledTimes(1));
    }

    it('says it was sent to Production only when the server confirmed', async () => {
      drainSyncs(1);
      const screen = await show();
      await send(screen);

      await waitFor(() =>
        expect(screen.getByText('Special Order sent to Production.')).toBeTruthy(),
      );
      expect(screen.queryByText(/Saved Offline/)).toBeNull();
      // The form is done with it — nothing is left to be sent a second time.
      expect(screen.getByTestId('special-order-name-0').props.value).toBe('');
    });

    /** Queued is not sent. Saying otherwise is how the same cake is ordered twice. */
    it('reports a queued order as saved offline, never as sent', async () => {
      drainSyncs(0);
      const screen = await show();
      await send(screen);

      await waitFor(() => expect(screen.getByText('Special Order Saved Offline')).toBeTruthy());
      expect(
        screen.getByText(
          'Your Special Order is stored on this device and syncs on its own when the connection returns.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Status: Waiting to sync')).toBeTruthy();
      expect(screen.queryByText(/sent to Production/i)).toBeNull();
      expect(screen.queryByText(/submitted/i)).toBeNull();
    });

    /** Refused is not queued: it waits for a person, not for a connection. */
    it('reports a refused order as not accepted, in the server\'s words', async () => {
      drainRefuses('Special Orders are closed for today.');
      const screen = await show();
      await send(screen);

      await waitFor(() => expect(screen.getByText('Not accepted')).toBeTruthy());
      expect(
        screen.getByText(
          'Special Orders are closed for today. It is saved and waiting in Sync Center — do not send it again.',
        ),
      ).toBeTruthy();
      expect(screen.queryByText(/Waiting to sync/)).toBeNull();
      expect(screen.queryByText(/sent to Production/i)).toBeNull();
      expect(screen.queryByText(/Saved Offline/)).toBeNull();
    });
  });
});
