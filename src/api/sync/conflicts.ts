import type { SyncEntity } from '@/common/database/repositories/syncQueueRepository';
import type { ApiError } from '@/api/errors';

/**
 * Conflict classification.
 *
 * ---------------------------------------------------------------------------
 * What a conflict is here
 * ---------------------------------------------------------------------------
 * Not "the request failed". A conflict is the server telling us **the world
 * moved while this transaction sat in the queue**: stock was sold by someone
 * else, the business day was closed, the record was deleted, the operator lost
 * the permission they had when they rang it up. Retrying cannot fix any of
 * those, and neither can guessing — so the row is stored with the server's own
 * account of the disagreement and put in front of a person.
 *
 * The server stays authoritative for money and stock. Nothing here ever
 * overwrites a server value or resolves itself; the only automatic act is
 * recording what happened.
 *
 * ---------------------------------------------------------------------------
 * The one safety rule that matters
 * ---------------------------------------------------------------------------
 * Every send carries `client_operation_id` as its `Idempotency-Key`, and the
 * server dedupes on it (server migration 84). That gives us a hard invariant:
 *
 *   Re-sending with the SAME key is always safe. The server replays its
 *   original answer instead of executing again.
 *
 *   Re-sending with a NEW key bypasses the dedupe entirely and EXECUTES.
 *
 * So `resend_as_new` — which mints a fresh id because the payload or the
 * business date changed — is offered **only when the operation certainly never
 * landed**. That is what `mayHaveLanded` gates. Getting this backwards is how a
 * stock return that already moved half its products moves them a second time.
 *
 * When in doubt the answer is `mayHaveLanded: true`. An operation wrongly
 * assumed dead is a duplicate sale; one wrongly assumed live is a person
 * checking a screen.
 */

export type ConflictType =
  /** 409 `Stock has changed. Please review your order.` — POST /api/orders, /api/orders/pos. */
  | 'stock_changed'
  /** 409 `Return quantity cannot be greater than available stock.` — POST /api/stock/return, pre-check. */
  | 'return_exceeds_stock'
  /** 409 from POST /api/stock/return mid-loop: some products ALREADY moved. */
  | 'partially_committed'
  /** 409 from the idempotency middleware: an earlier attempt never finished. */
  | 'already_in_flight'
  /** 422 `This Idempotency-Key was already used for a different request.` */
  | 'duplicate_operation'
  /** 403 from assertBusinessDayOpen — the day this belongs to has been closed. */
  | 'business_day_closed'
  /** 403 otherwise — role or branch changed under the operator. */
  | 'permission_changed'
  /** 404 — the record this depends on is gone from the server. */
  | 'record_deleted'
  /** 409 status-transition refusals: already reviewed / submitted / cancelled. */
  | 'already_modified'
  /** Detected on SUCCESS: the server priced the sale differently than the device did. */
  | 'price_changed'
  /** A 409 we do not recognise. Treated as the most dangerous case. */
  | 'unknown_conflict';

/**
 * What a person may do about it.
 *
 *   retry          — send again unchanged, SAME idempotency key. Always safe:
 *                    the server replays rather than re-executes.
 *   resend_as_new  — the payload or business date changed, so a NEW id is minted
 *                    and the server WILL execute it. Gated on `mayHaveLanded`.
 *   keep_server    — accept the server's version. The local row is closed as
 *                    `superseded`, never deleted: it is still the only record of
 *                    what the operator actually entered.
 */
export type ConflictResolution = 'retry' | 'resend_as_new' | 'keep_server';

export interface ConflictPolicy {
  type: ConflictType;
  /** Short heading for the conflict card. */
  title: string;
  /** Plain-language account of what the server said, for a non-technical operator. */
  explain: string;
  /**
   * Whether any part of this operation may already exist on the server.
   * True suppresses `resend_as_new` and makes the UI warn before anything else.
   */
  mayHaveLanded: boolean;
  /** Safe resolutions, most-recommended first. Never includes an unsafe one. */
  resolutions: readonly ConflictResolution[];
}

const POLICIES: Record<ConflictType, ConflictPolicy> = {
  stock_changed: {
    type: 'stock_changed',
    title: 'Stock changed',
    explain:
      'Stock was sold or moved elsewhere while this was waiting to sync, so there is no longer enough to cover it. Nothing was recorded on the server.',
    // InsufficientStockError is thrown by the validated path before any write.
    // The server comment is explicit: "No writes happen."
    mayHaveLanded: false,
    resolutions: ['resend_as_new', 'keep_server', 'retry'],
  },
  return_exceeds_stock: {
    type: 'return_exceeds_stock',
    title: 'Return is larger than stock on hand',
    explain:
      'The return is for more units than the branch currently holds. The balance changed after this was entered. Nothing was recorded on the server.',
    mayHaveLanded: false,
    resolutions: ['resend_as_new', 'keep_server', 'retry'],
  },
  partially_committed: {
    type: 'partially_committed',
    title: 'Partly recorded — check before re-sending',
    explain:
      'Some products in this return were already moved on the server before it failed on a later one. Sending it again as a new transaction would move those products twice.',
    // The server names exactly what went through in `committed`.
    mayHaveLanded: true,
    resolutions: ['keep_server', 'retry'],
  },
  already_in_flight: {
    type: 'already_in_flight',
    title: 'An earlier attempt did not finish',
    explain:
      'A previous send of this transaction stopped part-way and the server cannot tell whether it completed. Check whether it went through before entering it again.',
    mayHaveLanded: true,
    resolutions: ['keep_server', 'retry'],
  },
  duplicate_operation: {
    type: 'duplicate_operation',
    title: 'This transaction was changed after it was queued',
    explain:
      'The server already handled a different version of this transaction under the same reference. This version has not been recorded.',
    mayHaveLanded: false,
    resolutions: ['resend_as_new', 'keep_server'],
  },
  business_day_closed: {
    type: 'business_day_closed',
    title: 'That business day is closed',
    explain:
      'The day this transaction belongs to has been closed by Admin, so it can no longer be posted to it. It needs to be re-dated or handed to Admin.',
    mayHaveLanded: false,
    resolutions: ['resend_as_new', 'keep_server'],
  },
  permission_changed: {
    type: 'permission_changed',
    title: 'You no longer have permission for this',
    explain:
      'Your role or branch changed after this was entered, and the server will not accept it from this account. Nothing was recorded.',
    mayHaveLanded: false,
    // Not resend_as_new: a new id would not change the answer, and the payload
    // is not what the server objected to.
    resolutions: ['keep_server', 'retry'],
  },
  record_deleted: {
    type: 'record_deleted',
    title: 'The record this belongs to is gone',
    explain:
      'Something this transaction refers to was deleted on the server. It cannot be posted as it stands.',
    mayHaveLanded: false,
    resolutions: ['keep_server'],
  },
  already_modified: {
    type: 'already_modified',
    title: 'Already changed by someone else',
    explain:
      'This record moved to a later stage before your change arrived, and it can no longer be edited. The server version is the current one.',
    mayHaveLanded: true,
    resolutions: ['keep_server'],
  },
  price_changed: {
    type: 'price_changed',
    title: 'Priced differently by the server',
    explain:
      'The server recorded a different total than the till showed when this sale was rung up, because the product price changed while it was waiting to sync. The sale WAS recorded, at the server total.',
    // It succeeded. There is nothing to re-send.
    mayHaveLanded: true,
    resolutions: ['keep_server'],
  },
  unknown_conflict: {
    type: 'unknown_conflict',
    title: 'Rejected as conflicting',
    explain:
      'The server refused this because it disagrees with something already recorded. It has not been applied.',
    // Deliberately the cautious default: an unrecognised conflict never offers
    // a resend that would bypass the server's duplicate protection.
    mayHaveLanded: true,
    resolutions: ['keep_server', 'retry'],
  },
};

export function policyFor(type: ConflictType): ConflictPolicy {
  return POLICIES[type];
}

/** `resend_as_new` mints a new idempotency key, so it must never be offered blind. */
export function canResendAsNew(type: ConflictType): boolean {
  return POLICIES[type].resolutions.includes('resend_as_new');
}

function messageOf(error: ApiError): string {
  return typeof error.message === 'string' ? error.message : '';
}

/** The products a partial stock return already moved, when the server names them. */
export function committedItemsFrom(error: ApiError): unknown[] {
  const body = error.body;
  if (!body || typeof body !== 'object') return [];
  const committed = (body as Record<string, unknown>).committed;
  return Array.isArray(committed) ? committed : [];
}

/**
 * Which conflict this is.
 *
 * Matched on status first, then on the server's own wording — the routes do not
 * send a machine code on these paths, so the message is the only discriminator
 * available. Every pattern below was read off the server's route table; none is
 * speculative. An unrecognised 409 falls through to `unknown_conflict`, which is
 * the conservative branch rather than a gap.
 */
export function classifyConflict(error: ApiError, entity: SyncEntity): ConflictType {
  const message = messageOf(error);

  if (error.status === 404) return 'record_deleted';

  if (error.status === 403) {
    // src/middleware/assertBusinessDayOpen.ts
    return /business day has been closed/i.test(message)
      ? 'business_day_closed'
      : 'permission_changed';
  }

  if (error.status === 422) {
    // src/middleware/idempotency.ts — 'mismatch'
    if (/idempotency-key was already used/i.test(message)) return 'duplicate_operation';
    return 'unknown_conflict';
  }

  if (error.status === 409) {
    // Checked BEFORE the generic stock branch: this response also carries
    // shortfall `details`, and the `committed` array is the only thing that
    // distinguishes "nothing happened" from "half of it happened".
    if (committedItemsFrom(error).length > 0) return 'partially_committed';

    // src/middleware/idempotency.ts — stale 'in_progress'
    if (/earlier attempt at this transaction did not finish/i.test(message)) {
      return 'already_in_flight';
    }

    // src/routes/stock.routes.ts pre-check
    if (/return quantity cannot be greater/i.test(message)) return 'return_exceeds_stock';
    if (/stock for .* changed while the return was being saved/i.test(message)) {
      return 'partially_committed';
    }

    // src/routes/orders.routes.ts — InsufficientStockError on both sale paths
    if (/stock has changed/i.test(message) || /not enough stock/i.test(message)) {
      return entity === 'stock_movement' ? 'return_exceeds_stock' : 'stock_changed';
    }

    // Status-transition refusals across production orders / returns / demands.
    if (/already (been )?(reviewed|submitted|verified|corrected|cancelled|deleted)/i.test(message)) {
      return 'already_modified';
    }
    if (/no longer be (edited|deleted|added)/i.test(message)) return 'already_modified';
    if (/has already started/i.test(message)) return 'already_modified';

    return 'unknown_conflict';
  }

  return 'unknown_conflict';
}

/**
 * Whether this error is a conflict at all — i.e. the world moved, rather than
 * the request being malformed or the network being down.
 *
 * Broader than `kind === 'conflict'` on purpose. A closed business day arrives
 * as 403 and a deleted parent as 404; both used to park as anonymous `failed`
 * rows carrying one line of server text and no way to act on them. They are
 * conflicts in every sense that matters to the person holding the phone.
 *
 * Deliberately NOT included: 400/422 validation failures, which are a bad
 * payload rather than a moved world — except the one 422 the idempotency
 * middleware raises, which is a genuine collision.
 */
export function isConflictError(error: ApiError): boolean {
  if (error.status === 409 || error.status === 403 || error.status === 404) return true;
  if (error.status === 422 && /idempotency-key was already used/i.test(messageOf(error))) {
    return true;
  }
  return false;
}

/** Money as integer minor units, so 1200.00 and "1200" compare equal. */
function toMinorUnits(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export interface PriceDrift {
  expected: number;
  actual: number;
}

/**
 * A sale the server accepted at a total the device did not expect.
 *
 * This is the one conflict with no error attached: the request SUCCEEDS, and the
 * discrepancy is invisible at the counter. It is the documented server defect in
 * `docs/offline-sync.md` — `buildOrderItems` prices a queued sale from
 * `products.price` at COMMIT time rather than from the business date it carries,
 * so an offline sale that syncs after a price change is booked at the new price
 * while the customer paid the old one.
 *
 * The fix belongs in the server and cannot be made here. What CAN be done here
 * is refuse to let it pass silently: the difference is recorded as a conflict so
 * it reaches reconciliation instead of surfacing weeks later as an unexplained
 * variance. The sale itself stands — the server is authoritative for money.
 *
 * Returns null when either side is unreadable rather than guessing; a missing
 * total is not evidence of a discrepancy.
 */
export function detectPriceDrift(payload: unknown, response: unknown): PriceDrift | null {
  if (!payload || typeof payload !== 'object') return null;
  if (!response || typeof response !== 'object') return null;

  const expected = toMinorUnits((payload as Record<string, unknown>).grandTotal);
  const actual = toMinorUnits((response as Record<string, unknown>).grandTotal);
  if (expected === null || actual === null) return null;
  if (expected === actual) return null;

  return { expected: expected / 100, actual: actual / 100 };
}
