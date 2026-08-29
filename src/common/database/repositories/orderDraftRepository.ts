import { getDb } from '@/common/database/localDb';

/**
 * The unsent production order a branch left on the screen.
 *
 * ---------------------------------------------------------------------------
 * A draft is not a queued write, and must never be confused with one
 * ---------------------------------------------------------------------------
 * Everything else this device stores about a demand goes through
 * `writeOffline()`: a domain row plus a `sync_queue` row in one transaction, a
 * `client_operation_id` minted at creation, and a drain that will eventually
 * put it in front of Production. A draft is the opposite of all of that — it is
 * work the branch has explicitly NOT committed. It carries no operation id, it
 * is never sent, and nothing in `syncManager` can see it.
 *
 * That distinction is the whole reason it lives here rather than in
 * `local_production_orders`. A row in that table is a transaction the app owes
 * the server; a draft in that table would show up in "pending demands", would be
 * counted by the Sync Center badge, and would eventually be drained — turning
 * "let me finish this after the delivery" into an order nobody placed.
 *
 * ---------------------------------------------------------------------------
 * Why `app_metadata` and not a table of its own
 * ---------------------------------------------------------------------------
 * There is exactly one draft per branch, it is replaced wholesale every time,
 * and nothing queries inside it. That is a key/value, and `app_metadata` is
 * already the key/value bookkeeping table — `referenceRepository` keeps the
 * server's stock business date in it for the same reason. A new table would need
 * a migration, and migrations here are append-only and forward-only: a schema
 * change is permanent on every device that runs it, so it should be spent on
 * something with rows worth indexing.
 *
 * Keyed by branch because `branch_user` is a shift account carrying its
 * manager's `branchId` — two people on two devices share the branch, but each
 * device keeps its own copy, and a device moved to another branch must not
 * inherit the previous one's half-written demand.
 */

/**
 * One line of a draft.
 *
 * `rate` is stored with the line rather than looked up on restore, for the
 * reason the payload copies it too: a price that moves overnight must not
 * silently rewrite what the branch saw when it saved. On restore the row shows
 * the live catalogue price beside it if the two have diverged.
 */
export interface OrderDraftLine {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  remark: string;
}

export interface OrderDraft {
  lines: OrderDraftLine[];
  /** May be '' — a draft is explicitly allowed to have no required date yet. */
  requiredDate: string;
  /** Epoch ms, so the screen can say when rather than just that. */
  savedAt: number;
}

function draftKey(branchId: string): string {
  return `branch.orderDraft.${branchId}`;
}

export async function saveOrderDraft(
  branchId: string,
  draft: Omit<OrderDraft, 'savedAt'>,
  now = Date.now(),
): Promise<void> {
  const stored: OrderDraft = { ...draft, savedAt: now };
  await getDb().execute('INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)', [
    draftKey(branchId),
    JSON.stringify(stored),
  ]);
}

/**
 * Null when there is nothing stored — **and also when what is stored cannot be
 * read**.
 *
 * A draft is a convenience, not a record anyone is owed. Throwing on a payload
 * this version no longer understands would fail the whole screen at mount, so a
 * branch could not raise a demand at all because of a leftover it never asked to
 * keep. The unreadable value is left in place rather than deleted: it costs
 * nothing, and the next save replaces it.
 */
export async function readOrderDraft(branchId: string): Promise<OrderDraft | null> {
  const res = await getDb().execute('SELECT value FROM app_metadata WHERE key = ?', [
    draftKey(branchId),
  ]);
  const row = (res.rows as unknown as Array<{ value?: unknown }> | undefined)?.[0];
  if (!row?.value) return null;

  try {
    const parsed = JSON.parse(String(row.value)) as Partial<OrderDraft>;
    if (!Array.isArray(parsed.lines)) return null;
    return {
      lines: parsed.lines,
      requiredDate: typeof parsed.requiredDate === 'string' ? parsed.requiredDate : '',
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export async function clearOrderDraft(branchId: string): Promise<void> {
  await getDb().execute('DELETE FROM app_metadata WHERE key = ?', [draftKey(branchId)]);
}
