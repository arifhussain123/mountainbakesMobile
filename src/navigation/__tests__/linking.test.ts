import type { UserRole } from '@/shared/types/user.types';
import { buildLinking, isTabAvailable, routeForNotification } from '../linking';
import { openNotification } from '../helpers';
import { accessProfileFor, landingTabFor } from '../roleConfig';
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

/**
 * Where an unpermitted link actually lands.
 *
 * The guard used to resolve to a literal `Home`, which is a route a
 * `branch_user`'s navigator does not contain — the API refuses a shift account
 * every `/api/reports` route, so it has no Home tab, so the link went nowhere at
 * all. The fallback has to come from the same config that built the tabs.
 */
describe('unpermitted deep link fallback', () => {
  function fallbackTabFor(role: UserRole, path: string): string | undefined {
    const profile = profileFor(role);
    const linking = buildLinking(profile);
    const state = linking.getStateFromPath?.(path, linking.config);
    return state?.routes[0]?.name;
  }

  /**
   * The path has to be one that role genuinely lacks, which is not the same for
   * everyone: `reports` is a **finance** tab too (`/api/finance/reports`, a
   * different resource behind the same tab name), so an accountant following it
   * is not being redirected at all.
   */
  const UNREACHABLE: ReadonlyArray<[UserRole, string]> = [
    ['branch_user', 'reports'],
    ['production_user', 'reports'],
    ['accountant', 'products'],
    ['branch_manager', 'products'],
  ];

  it('sends a role to its own landing tab, not to a tab it does not have', () => {
    for (const [role, path] of UNREACHABLE) {
      const landing = landingTabFor(profileFor(role));
      expect({ role, to: fallbackTabFor(role, path) }).toEqual({ role, to: landing });
    }
  });

  it('lands a shift account on Sales, since it has no Home tab at all', () => {
    expect(isTabAvailable(profileFor('branch_user'), 'Home')).toBe(false);
    // Sales, not Orders: v5 puts the till in the second cell, so it is the first
    // tab a shift account can reach once Home is filtered out.
    expect(fallbackTabFor('branch_user', 'reports')).toBe('Sales');
  });

  it('leaves a permitted link alone', () => {
    const profile = profileFor('super_admin');
    const linking = buildLinking(profile);
    const state = linking.getStateFromPath?.('reports', linking.config);
    expect(state?.routes[0]?.name).toBe('Reports');
  });
});

/**
 * The bridge from a payload to the navigator.
 *
 * No navigator is mounted here, which is the cold-start case rather than a gap
 * in the test: a push that arrives while the app is still starting must report
 * that it could not be opened so the handler can replay it from `onReady`,
 * never silently drop it and never crash.
 */
describe('opening a notification', () => {
  it('reports not-ready rather than throwing before the tree is mounted', () => {
    expect(openNotification(profileFor('super_admin'), { type: 'order', orderId: 'o1' })).toBe(
      'not-ready',
    );
  });

  /**
   * `not-permitted` is checked BEFORE readiness, and the order matters: this
   * outcome is final, so a handler holding payloads to replay must not queue one
   * that will never be allowed to open.
   */
  it('reports not-permitted for a payload this role may not open, ready or not', () => {
    expect(openNotification(profileFor('accountant'), { type: 'order', orderId: 'o1' })).toBe(
      'not-permitted',
    );
    expect(openNotification(profileFor('super_admin'), { type: 'promo' })).toBe('not-permitted');
    // An order push with no id would otherwise open a blank detail screen.
    expect(openNotification(profileFor('super_admin'), { type: 'order' })).toBe('not-permitted');
  });
});
