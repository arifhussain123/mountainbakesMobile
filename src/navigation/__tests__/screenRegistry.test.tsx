/**
 * The registry imports every screen, and one of them reaches a native module
 * that has no Jest implementation: `ReportsScreen` → `useExportReport` →
 * `react-native-share`, whose TurboModule throws at import time. Mocked at the
 * hook rather than the library so nothing here depends on the shape of a
 * third-party spec — resolution never calls it either way.
 */
jest.mock('@/hooks/useExportReport', () => ({
  useExportReport: () => ({ exportReport: jest.fn(), isExporting: false, error: null }),
}));

import { resolveMoreScreen, resolveTabScreen } from '../screenRegistry';

/**
 * (role, route) → component.
 *
 * Kept apart from `navigationSurface.test.ts`, which is deliberately pure data:
 * that file imports no React and no screen, so it can walk every role's whole
 * navigation tree without mounting anything. This one is the other half — it
 * imports the registry, and therefore every screen with it — and asks the
 * question that file cannot: **does a route the config points at resolve to a
 * screen the account may actually use.**
 *
 * Nothing here renders. Resolution is identity comparison, so a screen that
 * needs providers, a session or a network is never mounted.
 */
describe('resolveMoreScreen', () => {
  /**
   * One word, two resources.
   *
   * `POST /api/orders/production-sale` sells out of the **central pool** and is
   * `requireRole('super_admin', 'production_user')`. The branch POS
   * (`POST /api/orders/pos`) refuses a production account outright, and the
   * admin's Sales is a cross-branch money view that writes nothing at all.
   * Handing this role either of the other two is a 403 on first use, or a till
   * whose confirm button always fails.
   */
  it('gives production the counter till and the admin the money view', () => {
    const production = resolveMoreScreen('production_user', 'Sales');
    const admin = resolveMoreScreen('super_admin', 'Sales');

    expect(production).not.toBeNull();
    expect(admin).not.toBeNull();
    expect(production).not.toBe(admin);
  });

  /** A branch reaches its own Sales as a tab (the POS), never from More. */
  it('offers no More Sales screen to a branch', () => {
    expect(resolveMoreScreen('branch_manager', 'Sales')).toBeNull();
    expect(resolveMoreScreen('branch_user', 'Sales')).toBeNull();
  });

  /**
   * Finance has no shop-floor surface at any layer, and this is the layer that
   * matters: `roleConfig` already leaves the row out, so nothing navigates
   * here — but a deep link could, and the registry is what makes that land on a
   * placeholder rather than on a till the account cannot use.
   */
  it('offers no Sales screen to a finance role', () => {
    expect(resolveMoreScreen('finance_admin', 'Sales')).toBeNull();
    expect(resolveMoreScreen('accountant', 'Sales')).toBeNull();
  });
});

describe('resolveMoreScreen — Returns', () => {
  /**
   * Same table, two routes, two gates.
   *
   * `GET /api/production-returns` is `requireRole('super_admin',
   * 'production_user')` on the router itself and is a work queue with actions;
   * `GET /api/stock/returns` is `requireRole('super_admin', ...BRANCH_ROLES)`,
   * scoped off the JWT, and is a shop's own read-only record. Handing a branch
   * the production screen is a 403 on first load, and handing production the
   * branch screen is a 400 — it has no branch of its own.
   */
  it('gives a branch its own record and production the review queue', () => {
    const branch = resolveMoreScreen('branch_manager', 'Returns');
    const production = resolveMoreScreen('production_user', 'Returns');

    expect(branch).not.toBeNull();
    expect(production).not.toBeNull();
    expect(branch).not.toBe(production);
  });

  it('gives both branch roles the same screen', () => {
    expect(resolveMoreScreen('branch_user', 'Returns')).toBe(
      resolveMoreScreen('branch_manager', 'Returns'),
    );
  });

  it('offers no Returns screen to a finance role', () => {
    expect(resolveMoreScreen('finance_admin', 'Returns')).toBeNull();
  });
});

describe('resolveTabScreen', () => {
  /**
   * The single-path rule, at the resolver.
   *
   * Production's Sales is a More row. If it ever also resolved as a tab, the
   * same till would be reachable two ways and `navigationSurface.test.ts` —
   * which only sees the config — would not notice, because the config would
   * still list it once.
   */
  it('gives production no Sales tab, only the More row', () => {
    expect(resolveTabScreen('production_user', 'Sales')).toBeNull();
  });

  /** The branch POS is the one Sales that is a tab. */
  it('gives both branch roles the POS as a tab', () => {
    expect(resolveTabScreen('branch_manager', 'Sales')).not.toBeNull();
    expect(resolveTabScreen('branch_user', 'Sales')).toBe(
      resolveTabScreen('branch_manager', 'Sales'),
    );
  });
});
