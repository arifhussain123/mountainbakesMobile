import { BRANCH_PRODUCTION_ORDER_STATUSES } from '../BranchDemandsScreen';
import type { BranchProductionOrderStatus } from '@/shared/types/production-order.types';

/**
 * The statuses this screen speaks are the backend's, exactly.
 *
 * The brief that asked for this screen proposed a friendlier-sounding workflow —
 * Waiting / Reviewed / Prepared / Delivered / Returned / Cancelled. The server
 * has no such states. Inventing a parallel vocabulary is how a client ends up
 * filtering on a value no row ever holds and showing an empty list that looks
 * like an empty shop.
 *
 * So this asserts the exact set, and it is deliberately a list written out by
 * hand rather than derived from the same constant the screen uses: if someone
 * adds a state to the union, this fails and makes them go and look at what the
 * server actually does with it.
 */

const FROM_THE_SERVER: BranchProductionOrderStatus[] = [
  // The four live states, in workflow order.
  'pending',
  'awaiting_verification',
  'verified',
  'approved',
  // Two terminal states outside that line, kept apart because only one of them
  // is a fulfilment failure.
  'rejected',
  'cancelled',
];

describe('branch demand statuses', () => {
  it('labels exactly the six states the backend defines', () => {
    expect(Object.keys(BRANCH_PRODUCTION_ORDER_STATUSES).sort()).toEqual(
      [...FROM_THE_SERVER].sort(),
    );
  });

  /**
   * The proposed names are not merely different words for the same states —
   * three of them describe steps this workflow does not have, and `verified` is
   * the one that matters most: it is where stock actually moves.
   */
  it('has no state the brief invented', () => {
    const invented = ['waiting', 'reviewed', 'prepared', 'delivered', 'returned'];
    for (const name of invented) {
      expect(Object.keys(BRANCH_PRODUCTION_ORDER_STATUSES)).not.toContain(name);
    }
  });

  it('keeps a withdrawal and a refusal apart', () => {
    // `cancelled` is the branch withdrawing before review; `rejected` is
    // Production refusing. Collapsing them would lose which side said no.
    expect(BRANCH_PRODUCTION_ORDER_STATUSES.cancelled).not.toEqual(
      BRANCH_PRODUCTION_ORDER_STATUSES.rejected,
    );
  });
});
