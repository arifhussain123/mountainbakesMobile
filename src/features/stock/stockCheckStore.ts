import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { StockCheckStorage } from './stockCheckStorage';

export interface StockCheckState {
  branchId: string | null;
  businessDate: string | null;
  /** productId -> raw count input text. A product with no entry here is "not counted" — never stored as "". */
  counts: Record<string, string>;
  loaded: boolean;
  /**
   * Loads (or starts fresh for) `branchId`+`businessDate` — the scope a draft
   * is keyed by. Switching to a different business date never carries over
   * the previous day's counts (brief's "auto-clear when the business date
   * changes"); it's a fresh, empty draft for the new key instead.
   */
  load: (branchId: string, businessDate: string) => Promise<void>;
  setCount: (productId: string, text: string) => void;
  /** Clears both the in-memory state and the persisted draft for the current scope. */
  clear: () => Promise<void>;
}

/**
 * Factory so the SQLite dependency is injected, not hardcoded — the app
 * wires the real `createSqliteStockCheckStorage()` once (the default export
 * below); a test wires an in-memory fake (same split as `writeQueue.ts`'s
 * `QueueStorage`/`createWriteQueue`), so persistence round-trips are
 * verified without touching native SQLite.
 */
export function createStockCheckStore(storage: StockCheckStorage): UseBoundStore<StoreApi<StockCheckState>> {
  return create<StockCheckState>((set, get) => ({
    branchId: null,
    businessDate: null,
    counts: {},
    loaded: false,

    load: async (branchId, businessDate) => {
      set({ loaded: false });
      const draft = await storage.get(branchId, businessDate);
      set({
        branchId,
        businessDate,
        counts: draft?.counts ?? {},
        loaded: true,
      });
    },

    setCount: (productId, text) => {
      const { branchId, businessDate, counts } = get();
      if (!branchId || !businessDate) return;
      const nextCounts = { ...counts };
      if (text.trim() === '') delete nextCounts[productId];
      else nextCounts[productId] = text;
      set({ counts: nextCounts });
      void storage.set({ branchId, businessDate, counts: nextCounts, updatedAt: Date.now() });
    },

    clear: async () => {
      const { branchId, businessDate } = get();
      set({ counts: {} });
      if (!branchId || !businessDate) return;
      await storage.clear(branchId, businessDate);
    },
  }));
}
