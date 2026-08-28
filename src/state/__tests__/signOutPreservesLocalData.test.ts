/**
 * Signing out drops cached server state and **nothing else**.
 *
 * The two halves are easy to conflate, and getting the second one wrong is the
 * expensive mistake: a branch handset is shared, so cached takings must not
 * follow one account into the next session — but the transactions rung up on
 * that phone are the *only* copy of a shift's work until they reach the server.
 * `clearCachedServerState()` is memory-only by construction (queryClient.ts
 * imports the library and nothing else), and this pins the behaviour so a later
 * "clear everything on sign-out" cannot quietly delete a shift.
 *
 * Runs against a real SQLite database through `node:sqlite`, so the queue rows,
 * the domain rows and the reference mirror are all genuinely re-read afterwards
 * rather than asserted against a stub.
 */

import { createTestDb, type TestDb } from '@/common/test-utils/sqliteTestDb';

const shared = globalThis as unknown as { __signOutDb: TestDb };

jest.mock('@/common/database/localDb', () => ({
  getDb: () => (globalThis as Record<string, any>).__signOutDb,
}));

jest.mock('@/api/supabase/client', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(async () => ({ error: null })),
      onAuthStateChange: jest.fn(),
      getSession: jest.fn(async () => ({ data: { session: null } })),
    },
  },
  getAccessToken: jest.fn(async () => 'token'),
}));

jest.mock('@/api/services/authService', () => ({
  financeLookup: jest.fn(),
  forgotPassword: jest.fn(),
  changePassword: jest.fn(),
}));

import { writeOffline } from '@/common/database/repositories/offlineWriteRepository';
import { saveProducts } from '@/common/database/repositories/referenceRepository';
import { getUnsyncedSummary } from '@/common/database/repositories/syncQueueRepository';
import { readProducts } from '@/common/database/repositories/referenceRepository';
import { runMigrations } from '@/common/database/runMigrations';
import { queryClient } from '@/api/queryClient';
import { qk } from '@/api/queryKeys';
import { useAuthStore } from '../authStore';

let db: TestDb;

beforeEach(async () => {
  db = createTestDb();
  shared.__signOutDb = db;
  await runMigrations(db);
});

afterEach(() => db.close());

it('keeps unsynced work and the reference mirror while dropping cached figures', async () => {
  // A shift's work: one sale queued on the device, plus the mirrored catalogue
  // the till needs to keep selling with no signal.
  await writeOffline({
    entity: 'sale',
    branchId: 'b-1',
    payload: { grandTotal: '1250.00', paymentMethod: 'easypaisa', items: [] },
  });
  await saveProducts([
    {
      id: 'p-1',
      name: 'Milk Rusk',
      sku: 'MR-100',
      categoryId: 'c-1',
      price: 100,
      isActive: true,
    } as never,
  ]);

  // ...and one cached figure that belongs to the account, not the device.
  queryClient.setQueryData(qk.reports.summary({ period: 'daily' }), { totalRevenue: '9999' });

  await useAuthStore.getState().signOut();

  // Gone: server state.
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);

  // Kept: the transaction, its queue row, and the catalogue behind the till.
  const summary = await getUnsyncedSummary();
  expect(summary.total).toBe(1);
  expect(summary.pending).toBe(1);

  const sales = await db.execute('SELECT client_operation_id, grand_total FROM local_sales');
  expect(sales.rows).toHaveLength(1);
  expect(sales.rows[0]!.grand_total).toBe('1250.00');

  const mirror = await readProducts();
  expect(mirror.rows.map(p => p.id)).toEqual(['p-1']);
});
