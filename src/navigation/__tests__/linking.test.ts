import type { UserRole } from '@/shared/types/user.types';
import { isTabAvailable, routeForNotification } from '../linking';
import { accessProfileFor } from '../roleConfig';
import { isBranchRole } from '../roleNavigation';

function profileFor(role: UserRole) {
  return accessProfileFor(role, isBranchRole(role) ? 'branch-1' : null);
}

describe('deep link permission guard', () => {
  it('allows a tab the role actually has', () => {
    expect(isTabAvailable(profileFor('super_admin'), 'Reports')).toBe(true);
    expect(isTabAvailable(profileFor('branch_manager'), 'Sales')).toBe(true);
  });

  /**
   * A link naming a tab the role does not have would push a screen with no tab
   * behind it — no back path, and for this role nothing to see. The caller sends
   * those to Home.
   */
  it('rejects a tab the role does not have', () => {
    expect(isTabAvailable(profileFor('branch_manager'), 'Reports')).toBe(false);
    expect(isTabAvailable(profileFor('production_user'), 'Ledger')).toBe(false);
    expect(isTabAvailable(profileFor('accountant'), 'Products')).toBe(false);
  });

  it('always allows More, which every role has', () => {
    expect(isTabAvailable(profileFor('branch_user'), 'More')).toBe(true);
    expect(isTabAvailable(profileFor('finance_auditor'), 'More')).toBe(true);
  });
});

describe('notification routing', () => {
  /**
   * The whole point of returning the tab as well as the screen: the order opens
   * INSIDE the Orders stack, so back goes to the order list rather than closing
   * a modal onto whatever happened to be underneath.
   */
  it('routes an order push into the Orders stack, not a bare modal', () => {
    expect(routeForNotification(profileFor('super_admin'), { type: 'order', orderId: 'o1' })).toEqual(
      { tab: 'Orders', screen: 'OrderDetail', params: { orderId: 'o1' } },
    );
  });

  it('routes a production order push for the production account', () => {
    const r = routeForNotification(profileFor('production_user'), {
      type: 'production_order',
      orderId: 'po9',
    });
    expect(r?.tab).toBe('Orders');
    expect(r?.params).toEqual({ orderId: 'po9' });
  });

  it('refuses an order push for a role with no Orders tab', () => {
    expect(
      routeForNotification(profileFor('accountant'), { type: 'order', orderId: 'o1' }),
    ).toBeNull();
  });

  it('refuses an order push with no id rather than opening a blank detail', () => {
    expect(routeForNotification(profileFor('super_admin'), { type: 'order' })).toBeNull();
  });

  it('sends a sync failure to the Sync Center', () => {
    expect(routeForNotification(profileFor('branch_user'), { type: 'sync_failed' })).toEqual({
      tab: 'More',
      screen: 'SyncCenter',
    });
  });

  it('ignores an unrecognised payload type', () => {
    expect(routeForNotification(profileFor('super_admin'), { type: 'promo' })).toBeNull();
    expect(routeForNotification(profileFor('super_admin'), {})).toBeNull();
  });
});
