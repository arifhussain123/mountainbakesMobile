import { createSqliteStockCheckStorage } from './stockCheckStorage';
import { createStockCheckStore } from './stockCheckStore';

/**
 * The app-wide singleton, backed by the real SQLite storage. Kept in its own
 * file — never imported by a test — so `stockCheckStore.ts` itself stays free
 * of the `@op-engineering/op-sqlite` import chain (same split as
 * `api/offlineQueue.ts` wiring `shared/offline/writeQueue.ts`).
 */
export const useStockCheckStore = createStockCheckStore(createSqliteStockCheckStorage());
