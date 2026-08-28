/**
 * The registry imports every screen, and one of them reaches a native module
 * that has no Jest implementation: `ReportsScreen` → `useExportReport` →
 * `react-native-share`, whose TurboModule throws at import time. Mocked at the
 * hook rather than the library so nothing here depends on the shape of a
 * third-party spec — resolution never calls it either way.
 */
jest.mock('@/features/admin/hooks/useExportReport', () => ({
  useExportReport: () => ({ exportReport: jest.fn(), isExporting: false, error: null }),
}));

import { resolveMoreScreen, resolveNewSaleScreen, resolveTabScreen } from '../screenRegistry';

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

  /** A branch reaches its own Sales as a tab (the register), never from More. */
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

describe('resolveMoreScreen — Settings', () => {
  /**
   * The regression this guards is a trap, not a cosmetic gap.
   *
   * Appearance was moved out of the account drawer on the reasoning that "theme
   * and accent are preferences, which is what the Settings row is for" — but
   * Settings resolved to `null` for every non-admin role, so it rendered the
   * "not built yet" placeholder and `MBAccentPicker` was mounted nowhere in the
   * app. A device left on a non-default accent could not be put back, because
   * the only control that sets one was unreachable.
   */
  it('gives every role a Settings screen, not a placeholder', () => {
    for (const role of [
      'branch_manager',
      'branch_user',
      'production_user',
      'super_admin',
      'finance_admin',
      'accountant',
    ] as const) {
      expect(resolveMoreScreen(role, 'Settings')).not.toBeNull();
    }
  });

  /**
   * The business-settings form stays admin-only: `PUT /api/settings` is
   * super_admin, so anyone else gets appearance alone rather than a save button
   * that always fails.
   */
  it('gives the admin a different screen from everyone else', () => {
    const admin = resolveMoreScreen('super_admin', 'Settings');
    const branch = resolveMoreScreen('branch_manager', 'Settings');

    expect(admin).not.toBeNull();
    expect(branch).not.toBeNull();
    expect(admin).not.toBe(branch);
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

  /** The branch register is the one Sales that is a tab. */
  it('gives both branch roles the register as a tab', () => {
    expect(resolveTabScreen('branch_manager', 'Sales')).not.toBeNull();
    expect(resolveTabScreen('branch_user', 'Sales')).toBe(
      resolveTabScreen('branch_manager', 'Sales'),
    );
  });

  /**
   * The Sales tab is the day's register and the till is a modal inside it, so
   * the two must resolve to **different** components. Handing the same screen to
   * both would put a form where the list belongs and leave the sale nothing to
   * return to — which is what the tab was before `SalesStack` existed.
   */
  it('keeps the register and the till apart', () => {
    expect(resolveNewSaleScreen('branch_manager')).not.toBeNull();
    expect(resolveNewSaleScreen('branch_manager')).not.toBe(
      resolveTabScreen('branch_manager', 'Sales'),
    );
    // A shift account sells from the same shop through the same endpoint.
    expect(resolveNewSaleScreen('branch_user')).toBe(resolveNewSaleScreen('branch_manager'));
  });

  /**
   * The till writes `POST /api/orders/pos`, which refuses a production account
   * outright and has no branch for an admin to sell from. Neither role has a
   * Sales tab to reach it from either, but a deep link to `sales/new` names a
   * route, and the registry is what decides whether that route exists.
   */
  it('gives the branch till to nobody else', () => {
    expect(resolveNewSaleScreen('production_user')).toBeNull();
    expect(resolveNewSaleScreen('super_admin')).toBeNull();
    expect(resolveNewSaleScreen('finance_admin')).toBeNull();
  });
});
