import { getOfflineDb } from '@/shared/offline/db';

export interface StockCheckDraft {
  branchId: string;
  businessDate: string;
  /** productId -> raw count input text, exactly as typed (empty string never stored — see `stockCheckStore.ts`). */
  counts: Record<string, string>;
  blindMode: boolean;
  updatedAt: number;
}

/** Storage port — one SQLite-backed implementation for the app, one in-memory fake for tests (same split as `shared/offline/writeQueue.ts`'s `QueueStorage`). */
export interface StockCheckStorage {
  get(branchId: string, businessDate: string): Promise<StockCheckDraft | null>;
  set(draft: StockCheckDraft): Promise<void>;
  clear(branchId: string, businessDate: string): Promise<void>;
}

interface StockCheckDraftRow {
  branch_id: string;
  business_date: string;
  counts_json: string;
  blind_mode: number;
  updated_at: number;
}

function rowToDraft(row: StockCheckDraftRow): StockCheckDraft {
  return {
    branchId: row.branch_id,
    businessDate: row.business_date,
    counts: JSON.parse(row.counts_json),
    blindMode: row.blind_mode === 1,
    updatedAt: row.updated_at,
  };
}

/** The real, on-device implementation — op-sqlite, the same app-wide offline DB `response_cache`/`write_queue` already share. */
export function createSqliteStockCheckStorage(): StockCheckStorage {
  return {
    async get(branchId, businessDate) {
      const db = getOfflineDb();
      const result = await db.execute('SELECT * FROM stock_check_drafts WHERE branch_id = ? AND business_date = ?', [branchId, businessDate]);
      const row = result.rows[0] as unknown as StockCheckDraftRow | undefined;
      return row ? rowToDraft(row) : null;
    },
    async set(draft) {
      const db = getOfflineDb();
      await db.execute(
        `INSERT INTO stock_check_drafts (branch_id, business_date, counts_json, blind_mode, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(branch_id, business_date) DO UPDATE SET
           counts_json = excluded.counts_json, blind_mode = excluded.blind_mode, updated_at = excluded.updated_at`,
        [draft.branchId, draft.businessDate, JSON.stringify(draft.counts), draft.blindMode ? 1 : 0, draft.updatedAt],
      );
    },
    async clear(branchId, businessDate) {
      const db = getOfflineDb();
      await db.execute('DELETE FROM stock_check_drafts WHERE branch_id = ? AND business_date = ?', [branchId, businessDate]);
    },
  };
}
