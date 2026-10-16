/**
 * @format
 */
import { createStockCheckStore } from '@/features/stock/stockCheckStore';
import type { StockCheckDraft, StockCheckStorage } from '@/features/stock/stockCheckStorage';

// Imports the store factory directly (not `@/features/stock`'s singleton,
// which wires real op-sqlite) — the same reasoning as
// `__tests__/writeQueue.test.ts`: inject an in-memory fake so persistence
// logic is testable without native SQLite.
function createInMemoryStorage(seed: StockCheckDraft[] = []): StockCheckStorage {
  const rows = new Map(seed.map((d) => [`${d.branchId}:${d.businessDate}`, d]));
  return {
    async get(branchId, businessDate) {
      return rows.get(`${branchId}:${businessDate}`) ?? null;
    },
    async set(draft) {
      rows.set(`${draft.branchId}:${draft.businessDate}`, draft);
    },
    async clear(branchId, businessDate) {
      rows.delete(`${branchId}:${businessDate}`);
    },
  };
}

describe('stockCheckStore', () => {
  it('starts empty for a scope with no prior draft', async () => {
    const useStore = createStockCheckStore(createInMemoryStorage());
    await useStore.getState().load('b1', '2026-10-16');
    expect(useStore.getState().counts).toEqual({});
    expect(useStore.getState().blindMode).toBe(false);
    expect(useStore.getState().loaded).toBe(true);
  });

  it('resumes a previously saved count for the same branch + business date', async () => {
    const storage = createInMemoryStorage([
      { branchId: 'b1', businessDate: '2026-10-16', counts: { p1: '12' }, blindMode: true, updatedAt: 1 },
    ]);
    const useStore = createStockCheckStore(storage);
    await useStore.getState().load('b1', '2026-10-16');
    expect(useStore.getState().counts).toEqual({ p1: '12' });
    expect(useStore.getState().blindMode).toBe(true);
  });

  it('auto-clears when the business date changes — a new date starts fresh, not carried over', async () => {
    const storage = createInMemoryStorage([
      { branchId: 'b1', businessDate: '2026-10-16', counts: { p1: '12' }, blindMode: false, updatedAt: 1 },
    ]);
    const useStore = createStockCheckStore(storage);
    await useStore.getState().load('b1', '2026-10-17');
    expect(useStore.getState().counts).toEqual({});
  });

  it('setCount persists immediately and survives a reload (app-kill simulation)', async () => {
    const storage = createInMemoryStorage();
    const useStore = createStockCheckStore(storage);
    await useStore.getState().load('b1', '2026-10-16');
    useStore.getState().setCount('p1', '7');

    // A fresh store instance over the same storage simulates the app restarting.
    const reloaded = createStockCheckStore(storage);
    await reloaded.getState().load('b1', '2026-10-16');
    expect(reloaded.getState().counts).toEqual({ p1: '7' });
  });

  it('an empty string clears a count rather than storing it as ""', async () => {
    const useStore = createStockCheckStore(createInMemoryStorage());
    await useStore.getState().load('b1', '2026-10-16');
    useStore.getState().setCount('p1', '5');
    useStore.getState().setCount('p1', '');
    expect(useStore.getState().counts).toEqual({});
  });

  it('clear() wipes both in-memory state and the persisted draft', async () => {
    const storage = createInMemoryStorage();
    const useStore = createStockCheckStore(storage);
    await useStore.getState().load('b1', '2026-10-16');
    useStore.getState().setCount('p1', '7');
    await useStore.getState().clear();
    expect(useStore.getState().counts).toEqual({});

    const reloaded = createStockCheckStore(storage);
    await reloaded.getState().load('b1', '2026-10-16');
    expect(reloaded.getState().counts).toEqual({});
  });
});
