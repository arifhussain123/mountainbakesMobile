import { ICONS } from '@/common/constants/navigationIcons';
import { USER_ROLES, type UserRole } from '@/shared/types/user.types';
import {
  ACCOUNT_PANEL,
  accessProfileFor,
  drawerItemKey,
  drawerSectionsFor,
  isKnownRole,
  landingTabFor,
  moreItemKey,
  moreSectionsFor,
  NAV_LABELS,
  QUICK_ACTIONS,
  quickActionsFor,
  tabsFor,
} from '../roleConfig';
import { FINANCE_ROLES } from '@/shared/types/finance.types';
import { isBranchRole } from '../roleNavigation';
import { TAB_ROOT_ROUTE } from '../types';

/**
 * The invariants that keep this navigation from rotting back into three menus.
 *
 * These assert the non-negotiables directly rather than mirroring a routing
 * table by hand: one path per screen, a safe unknown role, no more than five
 * tabs, and every icon/label key actually resolving.
 */

/** A profile per role, with a branchId where the role would really carry one. */
function profileFor(role: UserRole, allowSuperAdminWrite = false) {
  const branchId = isBranchRole(role) ? 'branch-1' : null;
  return accessProfileFor(role, branchId, allowSuperAdminWrite);
}

describe('navigation surface', () => {
  it('gives every real role a usable tab set', () => {
    for (const role of USER_ROLES) {
      const tabs = tabsFor(profileFor(role));
      expect(tabs.length).toBeGreaterThan(0);
      // Four daily-operations tabs plus More is the ceiling. Past five the
      // targets get too narrow to hit one-handed and the labels truncate.
      expect(tabs.length).toBeLessThanOrEqual(5);
    }
  });

  it('ends every role with More, exactly once', () => {
    for (const role of USER_ROLES) {
      const names = tabsFor(profileFor(role)).map(t => t.name);
      expect(names.filter(n => n === 'More')).toHaveLength(1);
      expect(names[names.length - 1]).toBe('More');
    }
  });

  /**
   * The rule that replaced "no destination on two surfaces".
   *
   * ------------------------------------------------------------------------
   * What changed, and why the old assertion is gone
   * ------------------------------------------------------------------------
   * This file used to assert that no route appeared as both a tab and a More
   * row, and the drawer was held to the same bar. That rule was never about
   * duplication being wrong in itself — it was about three hand-maintained
   * menus drifting apart, which is how this architecture rotted the first time.
   *
   * v5 makes the drawer a grouped index of the whole role, repeating Dashboard,
   * Orders and Stock from the bar **on purpose**: a five-cell bar is a set of
   * shortcuts, not a map. So the prohibition is replaced by derivation —
   * `drawerSectionsFor` reads `tabsFor` and `moreSectionsFor` rather than
   * declaring a third list — and by these three assertions, which are what
   * derivation has to be worth:
   *
   *   1. the drawer reaches everything the role has,
   *   2. it lists nothing twice,
   *   3. every row lands on a tab the role actually has.
   *
   * The old rule could only be checked by comparing three lists. This one is
   * true by construction and checked anyway, because "true by construction" is
   * a claim about code that someone will edit.
   */
  it('covers every tab and every More row in the drawer, for every role', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      const drawerKeys = new Set(
        drawerSectionsFor(profile).flatMap(s => s.items.map(drawerItemKey)),
      );

      // Every tab except More, which is not a destination of its own: its whole
      // content is expanded into the sections below it.
      for (const tab of tabsFor(profile)) {
        if (tab.name === 'More') continue;
        expect({ role, tab: tab.name, inDrawer: drawerKeys.has(tab.name) }).toEqual({
          role,
          tab: tab.name,
          inDrawer: true,
        });
      }

      for (const section of moreSectionsFor(profile)) {
        for (const item of section.items) {
          const key = `More/${item.route as string}`;
          expect({ role, route: item.route, inDrawer: drawerKeys.has(key) }).toEqual({
            role,
            route: item.route,
            inDrawer: true,
          });
        }
      }
    }
  });

  it('lists each drawer destination only once per role', () => {
    for (const role of USER_ROLES) {
      const keys = drawerSectionsFor(profileFor(role)).flatMap(s => s.items.map(drawerItemKey));
      expect({ role, unique: new Set(keys).size, total: keys.length }).toEqual({
        role,
        unique: keys.length,
        total: keys.length,
      });
    }
  });

  /**
   * A drawer row navigates into the tab navigator, so a row naming a tab the
   * role does not have would close the drawer onto nothing at all.
   */
  it('never points a drawer row at a tab the role does not have', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      const tabs = new Set(tabsFor(profile).map(t => t.name as string));
      for (const section of drawerSectionsFor(profile)) {
        for (const item of section.items) {
          expect({ role, item: drawerItemKey(item), reachable: tabs.has(item.tab) }).toEqual({
            role,
            item: drawerItemKey(item),
            reachable: true,
          });
        }
      }
    }
  });

  /** Every group carries a heading. v5's drawer has no floating rows. */
  it('heads every drawer section', () => {
    for (const role of USER_ROLES) {
      for (const section of drawerSectionsFor(profileFor(role))) {
        expect({ role, title: section.title, items: section.items.length > 0 }).toEqual({
          role,
          title: section.title,
          items: true,
        });
        expect(section.title).toBeTruthy();
      }
    }
  });

  it('lists each More destination only once per role', () => {
    for (const role of USER_ROLES) {
      const keys = moreSectionsFor(profileFor(role)).flatMap(s => s.items.map(moreItemKey));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('resolves every icon and label key it declares', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      for (const tab of tabsFor(profile)) {
        expect(ICONS[tab.icon]).toBeDefined();
        expect(NAV_LABELS[tab.label]).toBeTruthy();
        expect(TAB_ROOT_ROUTE[tab.name]).toBeTruthy();
      }
      for (const section of moreSectionsFor(profile)) {
        for (const item of section.items) {
          expect(ICONS[item.icon]).toBeDefined();
          expect(NAV_LABELS[item.label]).toBeTruthy();
        }
      }
    }
  });

  /**
   * The admin owns every surface in the product, which is exactly the role whose
   * tab bar is easiest to overload. These five are the daily ones; everything
   * else is a More row.
   */
  it('gives the admin the agreed five tabs, in order', () => {
    const tabs = tabsFor(profileFor('super_admin'));
    expect(tabs.map(t => t.name)).toEqual(['Home', 'Orders', 'Products', 'Reports', 'More']);
    expect(tabs.map(t => NAV_LABELS[t.label])).toEqual([
      'Home',
      'Orders',
      'Products',
      'Reports',
      'More',
    ]);
  });

  it("keeps the admin's secondary features in More rather than the tab bar", () => {
    const profile = profileFor('super_admin');
    const routes = moreSectionsFor(profile)
      .flatMap(s => s.items)
      .flatMap(i => (i.route ? [i.route as string] : []));
    for (const route of [
      'Users',
      'Categories',
      'Vendors',
      'Sales',
      'Stock',
      'Expenses',
      'Production',
      'SyncCenter',
      'Notifications',
      'Settings',
      'Help',
      'Profile',
    ]) {
      expect({ route, inMore: routes.includes(route) }).toEqual({ route, inMore: true });
    }
  });

  /**
   * The production floor's tab bar follows the shape of its day: what came in,
   * what is being made, what goes out. Stock is a lookup rather than a station,
   * so it is a More row — and it must resolve to production's own stock screen,
   * not the branch shelf one.
   */
  it('gives production the floor stages as tabs and Stock as a More row', () => {
    const profile = profileFor('production_user');
    expect(tabsFor(profile).map(t => t.name)).toEqual([
      'Home',
      'Orders',
      'Preparation',
      'Delivery',
      'More',
    ]);

    const routes = moreSectionsFor(profile)
      .flatMap(s => s.items)
      .flatMap(i => (i.route ? [i.route as string] : []));
    expect(routes).toContain('Stock');
    expect(routes).toContain('Reports');
    // The counter till. A More row and never a tab: the four tabs are the
    // stages of the floor's day, and the counter sells between them.
    expect(routes).toContain('Sales');
    // And the printer that till prints on. It follows Sales rather than
    // standing on its own: the row exists because this account rings sales up.
    expect(routes).toContain('Printer');
  });

  /**
   * Finance is a separate product surface, and its tab bar says so: no Orders,
   * no Products, nothing from the shop floor.
   */
  it('gives every finance role the agreed five tabs, in order', () => {
    for (const role of FINANCE_ROLES) {
      const tabs = tabsFor(profileFor(role));
      expect({ role, tabs: tabs.map(t => t.name) }).toEqual({
        role,
        tabs: ['Home', 'Income', 'Expenses', 'Reports', 'More'],
      });
      expect(tabs.map(t => NAV_LABELS[t.label])).toEqual([
        'Dashboard',
        'Income',
        'Expenses',
        'Reports',
        'More',
      ]);
    }
  });

  it('gives every finance role the same More list', () => {
    for (const role of FINANCE_ROLES) {
      const keys = moreSectionsFor(profileFor(role)).flatMap(s => s.items.map(moreItemKey));
      expect({ role, keys }).toEqual({
        role,
        keys: [
          'PartnerExpenses',
          'SyncCenter',
          'Notifications',
          'Events',
          'Profile',
          'Help',
          'Settings',
        ],
      });
    }
  });

  /**
   * The rule that matters most on this menu: never advertise a screen the
   * account cannot use. Each of these is refused by the server for a finance
   * role, verified against the handlers rather than assumed —
   *
   *   Sales    POST /api/orders/pos            super_admin + branch roles
   *   Stock    GET  /api/stock                 400 without a branchId, which a
   *                                            finance account never carries;
   *            GET  /api/stock/audit           403 for non-branch, non-admin
   *   Closing  /api/business-day               branch + admin
   *   Users / Categories / Vendors / Branches / Production — admin operations
   *
   * A row that only ever answers 403 (or, offline, queues a write that parks as
   * failed) teaches staff to distrust the whole menu.
   */
  it('keeps surfaces the backend refuses out of every finance menu', () => {
    const REFUSED = [
      'Sales',
      'Stock',
      'Orders',
      'Products',
      'Closing',
      'Production',
      'Users',
      'Categories',
      'Vendors',
      'Branches',
      // Not a backend refusal — the Printer screen reads no endpoint at all.
      // It is here for the same reason the others are: a finance account never
      // rings up a sale, so a printer it chose would never print anything, and
      // a row that leads nowhere useful teaches staff to distrust the menu.
      'Printer',
    ];

    for (const role of FINANCE_ROLES) {
      const profile = profileFor(role);
      const reachable = [
        ...tabsFor(profile).map(t => t.name as string),
        ...moreSectionsFor(profile)
          .flatMap(s => s.items)
          .flatMap(i => (i.route ? [i.route as string] : [])),
      ];
      for (const route of REFUSED) {
        expect({ role, route, offered: reachable.includes(route) }).toEqual({
          role,
          route,
          offered: false,
        });
      }
    }
  });

  /**
   * The branch set, which both branch roles share. A shift account is its
   * manager's counter, not a lesser branch, so the two differ only where the
   * server does.
   */
  it('gives a branch manager Home · Sales · Orders · Stock, then More', () => {
    const tabs = tabsFor(profileFor('branch_manager'));
    expect(tabs.map(t => t.name)).toEqual(['Home', 'Sales', 'Orders', 'Stock', 'More']);
  });

  it('lists the branch More rows in order, ending with the common App group', () => {
    const items = moreSectionsFor(profileFor('branch_manager')).flatMap(s => s.items);
    expect(items.map(moreItemKey)).toEqual([
      'Expenses',
      'Returns',
      // The day's takings and spending, summed from two lists this role already
      // reaches. Ungated, unlike Reports beneath it: it adds no endpoint.
      'Closing',
      // Claims against a delivery. Behind BRANCH_ROLES server-side, so both
      // branch roles get it.
      'Discounts',
      // The counter's Bluetooth receipt printer. Ungated: both branch roles
      // work the till, the choice never leaves the handset, and there is no
      // endpoint behind it to authorise against.
      'Printer',
      'Reports',
      'SyncCenter',
      'Notifications',
      // Universal, and gated by nothing: `/api/special-events` is behind
      // `authenticate` alone and scopes its rows server-side, so a branch sees
      // the events it is being asked to bake for.
      'Events',
      'Profile',
      'Help',
      'Settings',
    ]);
  });

  /**
   * The one place the two branch roles diverge, and it is not a style choice:
   * `reports.routes.ts` mounts every `/api/reports` route behind
   * `requireRole('super_admin', 'branch_manager')`, and `GET /summary` is the
   * branch dashboard's only data source. A Home tab for a shift account would be
   * a 403 error state as the first screen of the shift, so it opens on Orders.
   */
  it('withholds Home and Reports from a shift account, which the API 403s', () => {
    const shift = profileFor('branch_user');
    expect(shift.capabilities.has('reports')).toBe(false);
    /* Sales first, not Orders. v5 swaps the two, so a shift account without a
       Home tab now opens on the till — which is the screen it is standing at,
       and a better landing than a list of demands it rarely raises. */
    expect(tabsFor(shift).map(t => t.name)).toEqual(['Sales', 'Orders', 'Stock', 'More']);
    expect(landingTabFor(shift)).toBe('Sales');

    const routes = moreSectionsFor(shift)
      .flatMap(s => s.items)
      .flatMap(i => (i.route ? [i.route as string] : []));
    expect(routes).not.toContain('Reports');
    expect(routes).toContain('Expenses');
  });

  it('grants the reports capability exactly where the API does', () => {
    for (const role of USER_ROLES) {
      const expected = role === 'super_admin' || role === 'branch_manager';
      expect({ role, reports: profileFor(role).capabilities.has('reports') }).toEqual({
        role,
        reports: expected,
      });
    }
  });

  /**
   * The account footer is not a menu, and its entries are not destinations.
   *
   * This check was missing once and its absence shipped a real bug. The old
   * single-path test compared More routes against *tab names* only, so sign-out
   * sat in the account panel and in More at the same time — two paths, two
   * separately-written confirms, and the panel's had no confirm at all. It
   * dropped the session without ever mentioning that the queue still held the
   * only copy of a transaction.
   *
   * `ACCOUNT_PANEL` is what the drawer's **pinned footer** carries: identity,
   * the branch, the connection dot and sign-out. The drawer above it became a
   * navigation surface in v5 (see the coverage assertions at the top of this
   * file), but the footer deliberately did not: a row goes somewhere, a button
   * does something, and a sign-out that scrolls with a growing menu is one
   * somebody hits by accident.
   *
   * So the old bar still applies to these five and only these five — none may be
   * a tab, a More row or a drawer row, for any role.
   */
  it('keeps the account footer out of every navigation surface', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      const moreKeys = new Set(moreSectionsFor(profile).flatMap(s => s.items.map(moreItemKey)));
      const tabNames = new Set(tabsFor(profile).map(t => t.name as string));
      const drawerKeys = new Set(
        drawerSectionsFor(profile).flatMap(s => s.items.map(drawerItemKey)),
      );

      for (const entry of ACCOUNT_PANEL) {
        expect({
          role,
          entry,
          inMore: moreKeys.has(entry),
          isATab: tabNames.has(entry),
          inDrawer: drawerKeys.has(entry),
        }).toEqual({ role, entry, inMore: false, isATab: false, inDrawer: false });
      }
    }
  });

  /**
   * Sign-out is not a More row at all any more — it belongs to the account
   * panel. `MoreItem` has no action variant, so this cannot regress without a
   * deliberate type change, but the assertion states the intent for a reader.
   */
  it('keeps sign-out out of More for every role', () => {
    for (const role of USER_ROLES) {
      const keys = moreSectionsFor(profileFor(role)).flatMap(s => s.items.map(moreItemKey));
      expect({ role, hasSignOut: keys.includes('signOut') }).toEqual({ role, hasSignOut: false });
    }
  });

  /**
   * The brief's per-role feature list, asserted as reachability.
   *
   * This is the requirement restated as a test: whatever the tab/More split
   * happens to be, each role must be able to *get to* the things its brief lists.
   * Written against reachable surfaces rather than tab names on purpose — moving
   * Stock from a tab to a More row is a layout decision and must not fail here,
   * but dropping it entirely must.
   *
   * `New Order` is deliberately absent from the branch list: it is a create
   * action, and it lives as a modal on `OrdersStack` reachable from the order
   * list, not as a navigation destination. A tab whose only job is to open a
   * form leaves the resource it creates with no list to return to — see
   * `docs/navigation.md`.
   */
  const BRIEF: ReadonlyArray<[UserRole, readonly string[]]> = [
    [
      'super_admin',
      ['Home', 'Users', 'Products', 'Categories', 'Vendors', 'Orders', 'Sales', 'Stock', 'Expenses', 'Reports', 'Settings'],
    ],
    ['branch_manager', ['Home', 'Sales', 'Stock', 'Expenses', 'Reports']],
    ['production_user', ['Home', 'Orders', 'Preparation', 'Stock', 'Delivery']],
    ['finance_admin', ['Home', 'Income', 'Expenses', 'PartnerExpenses', 'Reports']],
    ['finance_manager', ['Home', 'Income', 'Expenses', 'PartnerExpenses', 'Reports']],
    ['accountant', ['Home', 'Income', 'Expenses', 'PartnerExpenses', 'Reports']],
    ['finance_auditor', ['Home', 'Income', 'Expenses', 'PartnerExpenses', 'Reports']],
  ];

  it.each(BRIEF)('gives %s everything its brief lists', (role, required) => {
    const profile = profileFor(role);
    const reachable = new Set<string>([
      ...tabsFor(profile).map(t => t.name as string),
      ...moreSectionsFor(profile).flatMap(s => s.items.map(moreItemKey)),
    ]);

    for (const feature of required) {
      expect({ role, feature, reachable: reachable.has(feature) }).toEqual({
        role,
        feature,
        reachable: true,
      });
    }
  });

  it('lands every role on its own first tab', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      expect(landingTabFor(profile)).toBe(tabsFor(profile)[0]?.name);
    }
  });
});

describe('unknown role', () => {
  const UNKNOWN = 'warehouse_supervisor' as UserRole;

  it('is not mistaken for a known one', () => {
    expect(isKnownRole(UNKNOWN)).toBe(false);
    for (const role of USER_ROLES) expect(isKnownRole(role)).toBe(true);
  });

  it('falls back to a minimal shell rather than crashing', () => {
    const tabs = tabsFor(accessProfileFor(UNKNOWN, null));
    expect(tabs.map(t => t.name)).toEqual(['Home', 'More']);
  });

  /**
   * The failure that matters. Falling open would hand an unrecognised account
   * the widest menu in the app — the API would still refuse the requests, but
   * the UI would be advertising capabilities that are not theirs.
   */
  it('does not escalate to the admin tab set', () => {
    const unknown = tabsFor(accessProfileFor(UNKNOWN, null)).map(t => t.name);
    const admin = tabsFor(profileFor('super_admin')).map(t => t.name);
    expect(unknown).not.toEqual(admin);
    expect(unknown).not.toContain('Reports');
    expect(unknown).not.toContain('Products');
  });
});

describe('capability filtering', () => {
  it('reduces the menu when a capability is missing', () => {
    // finance_auditor may view and nothing else; every finance tab is gated on
    // `finance:view`, so it keeps them — the point is that the gate is real.
    const auditor = profileFor('finance_auditor');
    expect(auditor.capabilities.has('finance:view')).toBe(true);
    expect(auditor.capabilities.has('finance:create')).toBe(false);
    expect(auditor.capabilities.has('finance:approve')).toBe(false);
  });

  /**
   * Super Admin sees finance read-only unless the server-side
   * `allowSuperAdminWrite` setting is on, which defaults to off.
   */
  it('keeps finance read-only for a super admin by default', () => {
    expect(profileFor('super_admin').capabilities.has('finance:create')).toBe(false);
    expect(profileFor('super_admin', true).capabilities.has('finance:create')).toBe(true);
    expect(profileFor('super_admin').capabilities.has('finance:view')).toBe(true);
  });

  /**
   * The property the whole declarative design rests on: **filtering only ever
   * removes.**
   *
   * "A user whose permissions are a subset of their role's default sees fewer
   * items automatically — no special-casing." Asserting it as a property rather
   * than by example is what stops the first `if (role === ...)` from creeping
   * into `tabsFor`: any branch that *adds* a surface when a capability is taken
   * away fails here, for every role and every capability at once.
   *
   * The empty-set fallback is included on purpose. Stripping every capability
   * from a finance role empties its tab list, and `tabsFor` then returns the
   * Home + More shell rather than a navigator with zero screens — Home is in
   * every declared set, so the shell is still a subset and the property holds.
   */
  it('never adds a surface when a capability is removed, for any role', () => {
    for (const role of USER_ROLES) {
      const full = profileFor(role);
      const fullTabs = new Set(tabsFor(full).map(t => t.name as string));
      const fullMore = new Set(moreSectionsFor(full).flatMap(s => s.items.map(moreItemKey)));

      for (const dropped of full.capabilities) {
        const reduced = {
          ...full,
          capabilities: new Set([...full.capabilities].filter(c => c !== dropped)),
        };

        for (const tab of tabsFor(reduced)) {
          expect({ role, dropped, tab: tab.name, wasThere: fullTabs.has(tab.name) }).toEqual({
            role,
            dropped,
            tab: tab.name,
            wasThere: true,
          });
        }

        for (const key of moreSectionsFor(reduced).flatMap(s => s.items.map(moreItemKey))) {
          expect({ role, dropped, key, wasThere: fullMore.has(key) }).toEqual({
            role,
            dropped,
            key,
            wasThere: true,
          });
        }
      }
    }
  });

  /**
   * A shift account carries its manager's branchId. Without one it is broken
   * upstream, and branch-scoped screens would open an empty shop.
   */
  it('treats a branch_user as branch-scoped only when it carries a branchId', () => {
    expect(accessProfileFor('branch_user', 'branch-1').capabilities.has('branch')).toBe(true);
    expect(accessProfileFor('branch_user', null).capabilities.has('branch')).toBe(false);
  });
});

/**
 * Quick actions are accelerators, not a fifth surface.
 *
 * They add no destination — every one leads somewhere the role already has — so
 * they are deliberately absent from the single-path assertions above. What has
 * to hold instead is reachability: a card into a tab the role does not carry
 * would be a dead control on the busiest screen in the app.
 */
describe('quick actions', () => {
  it('only ever lands somewhere the role already has', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      const tabs = new Set(tabsFor(profile).map(t => t.name));
      const moreRoutes = new Set<string>(
        moreSectionsFor(profile).flatMap(section => section.items.map(item => item.route as string)),
      );

      for (const action of quickActionsFor(profile)) {
        expect({ role, tab: action.tab, has: tabs.has(action.tab) }).toEqual({
          role,
          tab: action.tab,
          has: true,
        });
        if (action.tab === 'More' && action.screen) {
          expect({ role, screen: action.screen, has: moreRoutes.has(action.screen) }).toEqual({
            role,
            screen: action.screen,
            has: true,
          });
        }
      }
    }
  });

  /**
   * The filter in `quickActionsFor` is a safety net, not a design tool. If it
   * ever drops something, the config named a place that role cannot go — a bug
   * in `roleConfig.ts` rather than a card to quietly hide.
   */
  it('drops nothing — the declared set is reachable as written', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      const declared = QUICK_ACTIONS[profile.group] ?? [];
      expect({ role, count: quickActionsFor(profile).length }).toEqual({
        role,
        count: declared.length,
      });
    }
  });

  /**
   * Six cards — v5's row, and New Order is back among them.
   *
   * It was deliberately absent while the navigation bar carried it in its
   * centre: one action, one control. v5 removes that button, so the reason went
   * with it and the card is the shortest path to a new demand again.
   *
   * Asserted as an exact ordered list rather than a count, because the order is
   * the design — these are the jobs of a shift in the sequence they happen.
   */
  it('gives a branch the six jobs of a shift, in order', () => {
    for (const role of ['branch_manager', 'branch_user'] as const) {
      const labels = quickActionsFor(profileFor(role)).map(a => a.label);
      expect({ role, labels }).toEqual({
        role,
        labels: ['newSale', 'newOrder', 'orders', 'stock', 'addExpense', 'returns'],
      });
    }
  });

  /**
   * There is no centre action any more, and this is where the test for it was.
   *
   * v4 put one create action in the middle of the navigation bar and held it to
   * the same reachability rule as a quick action. v5 removes the button; the
   * config, the helper and the bar's notch arithmetic went with it, so there is
   * nothing left to assert. The quick-action row above is where New Order lives
   * now.
   */

  /**
   * Empty is the honest state for the other three groups: nobody has said what
   * their four are, and four plausible-looking guesses on a dashboard teach
   * staff to stop looking at the row.
   */
  it('offers none to a role whose set has not been decided', () => {
    for (const role of ['super_admin', 'production_user', 'finance_admin'] as const) {
      expect({ role, actions: quickActionsFor(profileFor(role)) }).toEqual({ role, actions: [] });
    }
  });
});
