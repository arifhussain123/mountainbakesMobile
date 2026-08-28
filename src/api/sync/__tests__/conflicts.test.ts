import { ApiError } from '@/api/errors';
import {
  canResendAsNew,
  classifyConflict,
  committedItemsFrom,
  detectPriceDrift,
  isConflictError,
  policyFor,
  type ConflictType,
} from '../conflicts';

/**
 * Conflict classification, pinned against the server's actual responses.
 *
 * Every message asserted here was read off the server's route table. If one of
 * them is reworded upstream these tests fail, which is the point: a conflict
 * that stops being recognised silently becomes `unknown_conflict`, and the
 * operator loses the specific guidance for the thing that actually happened.
 */

function err(init: {
  status: number;
  message: string;
  details?: unknown;
  body?: unknown;
}): ApiError {
  return new ApiError({
    kind:
      init.status === 409
        ? 'conflict'
        : init.status === 403
        ? 'authorization'
        : init.status === 404
        ? 'notFound'
        : 'validation',
    message: init.message,
    status: init.status,
    ...(init.details === undefined ? {} : { details: init.details }),
    ...(init.body === undefined ? {} : { body: init.body }),
  });
}

describe('classifyConflict', () => {
  it('reads a sale blocked on stock — src/routes/orders.routes.ts', () => {
    const e = err({
      status: 409,
      message: 'Stock has changed. Please review your order.',
      details: [{ productId: 'p1', productName: 'Milk Rusk', requested: 12, available: 4 }],
    });
    expect(classifyConflict(e, 'sale')).toBe('stock_changed');
    expect(classifyConflict(e, 'order')).toBe('stock_changed');
  });

  it('reads an over-return — src/routes/stock.routes.ts pre-check', () => {
    const e = err({
      status: 409,
      message: 'Return quantity cannot be greater than available stock.',
      details: [{ productId: 'p1', productName: 'Milk Rusk', requested: 9, available: 2 }],
    });
    expect(classifyConflict(e, 'stock_movement')).toBe('return_exceeds_stock');
  });

  /**
   * The single most important classification in the file. This response ALSO
   * carries shortfall `details`, so a classifier that checked those first would
   * call it an ordinary stock conflict — and ordinary stock conflicts are
   * cleared for `resend_as_new`, which would move the already-committed
   * products a second time.
   */
  it('detects a partly-committed return ahead of the generic stock branch', () => {
    const e = err({
      status: 409,
      message: 'Stock for Milk Rusk changed while the return was being saved.',
      details: [{ productId: 'p2', productName: 'Cake Rusk', requested: 5, available: 1 }],
      body: {
        error: 'Stock for Milk Rusk changed while the return was being saved.',
        details: [{ productId: 'p2', productName: 'Cake Rusk', requested: 5, available: 1 }],
        committed: [{ id: 'r-1', productName: 'Milk Rusk', qty: 3 }],
      },
    });
    expect(classifyConflict(e, 'stock_movement')).toBe('partially_committed');
    expect(committedItemsFrom(e)).toHaveLength(1);
  });

  it('reads a stale in-flight claim — src/middleware/idempotency.ts', () => {
    const e = err({
      status: 409,
      message:
        'An earlier attempt at this transaction did not finish. Check whether it went through before sending it again.',
    });
    expect(classifyConflict(e, 'sale')).toBe('already_in_flight');
  });

  it('reads an idempotency-key mismatch as a collision, not a validation failure', () => {
    const e = err({
      status: 422,
      message: 'This Idempotency-Key was already used for a different request.',
    });
    expect(classifyConflict(e, 'sale')).toBe('duplicate_operation');
    expect(isConflictError(e)).toBe(true);
  });

  it('separates a closed business day from an ordinary permission refusal', () => {
    const closed = err({
      status: 403,
      message: 'This business day has been closed. Please contact Admin.',
    });
    const denied = err({ status: 403, message: 'This demand belongs to a different branch' });
    expect(classifyConflict(closed, 'expense')).toBe('business_day_closed');
    expect(classifyConflict(denied, 'production_order')).toBe('permission_changed');
  });

  it('reads a 404 as a record deleted upstream', () => {
    expect(classifyConflict(err({ status: 404, message: 'Order not found' }), 'order')).toBe(
      'record_deleted',
    );
  });

  it('reads status-transition refusals as already modified', () => {
    const cases = [
      'Order already reviewed',
      'This order has already been submitted — items can no longer be added',
      'Production has already started on this demand — it can no longer be deleted',
    ];
    for (const message of cases) {
      expect(classifyConflict(err({ status: 409, message }), 'production_order')).toBe(
        'already_modified',
      );
    }
  });

  it('falls back to the cautious branch for an unrecognised 409', () => {
    const type = classifyConflict(err({ status: 409, message: 'Something new upstream' }), 'sale');
    expect(type).toBe('unknown_conflict');
    // Cautious means: assume it may have landed, so never offer a new key.
    expect(policyFor(type).mayHaveLanded).toBe(true);
    expect(canResendAsNew(type)).toBe(false);
  });
});

describe('isConflictError', () => {
  it('covers 409, 403 and 404 — a moved world, not a bad request', () => {
    expect(isConflictError(err({ status: 409, message: 'x' }))).toBe(true);
    expect(isConflictError(err({ status: 403, message: 'x' }))).toBe(true);
    expect(isConflictError(err({ status: 404, message: 'x' }))).toBe(true);
  });

  it('leaves ordinary validation alone', () => {
    expect(isConflictError(err({ status: 400, message: 'amount must be positive' }))).toBe(false);
    expect(isConflictError(err({ status: 422, message: 'items: Required' }))).toBe(false);
  });
});

/**
 * The invariant the whole feature rests on.
 *
 * Re-sending with the same client_operation_id is always safe — the server
 * dedupes on it. Re-sending with a NEW one bypasses that and executes. So any
 * conflict where part of the operation may already exist on the server must
 * never offer `resend_as_new`.
 */
describe('resolution safety', () => {
  const ALL: ConflictType[] = [
    'stock_changed',
    'return_exceeds_stock',
    'partially_committed',
    'already_in_flight',
    'duplicate_operation',
    'business_day_closed',
    'permission_changed',
    'record_deleted',
    'already_modified',
    'price_changed',
    'unknown_conflict',
  ];

  it('never offers a new idempotency key for anything that may have landed', () => {
    for (const type of ALL) {
      const policy = policyFor(type);
      if (policy.mayHaveLanded) {
        expect(policy.resolutions).not.toContain('resend_as_new');
      }
    }
  });

  it('always leaves a way out', () => {
    for (const type of ALL) {
      expect(policyFor(type).resolutions.length).toBeGreaterThan(0);
      // Accepting the server's version is possible for every conflict: the
      // server is authoritative for money and stock, so it is the one
      // resolution that is always available.
      expect(policyFor(type).resolutions).toContain('keep_server');
    }
  });

  it('explains every conflict in words an operator can act on', () => {
    for (const type of ALL) {
      const policy = policyFor(type);
      expect(policy.title.length).toBeGreaterThan(0);
      expect(policy.explain.length).toBeGreaterThan(20);
    }
  });
});

describe('detectPriceDrift', () => {
  /**
   * The documented server defect: a queued sale is priced at drain time rather
   * than at sale time, so an offline sale that syncs after a price change is
   * booked at the new price while the customer paid the old one. The request
   * SUCCEEDS, which is why nothing else catches it.
   */
  it('catches a sale the server priced differently', () => {
    expect(detectPriceDrift({ grandTotal: 1200 }, { grandTotal: 1440 })).toEqual({
      expected: 1200,
      actual: 1440,
    });
  });

  it('treats string and number totals as the same money', () => {
    expect(detectPriceDrift({ grandTotal: '1200.00' }, { grandTotal: 1200 })).toBeNull();
  });

  it('says nothing when either side is unreadable — a gap is not a discrepancy', () => {
    expect(detectPriceDrift({ grandTotal: 1200 }, {})).toBeNull();
    expect(detectPriceDrift({}, { grandTotal: 1200 })).toBeNull();
    expect(detectPriceDrift(null, { grandTotal: 1200 })).toBeNull();
  });
});
