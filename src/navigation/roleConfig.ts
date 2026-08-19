import type { IconKey } from '@/constants/navigationIcons';
import { financeCan, type FinancePermission } from '@/shared/types/finance.types';
import type { UserRole } from '@/shared/types/user.types';
import { isBranchRole, roleGroupFor, type RoleGroup } from './roleNavigation';
import type { AppTabName, MoreRouteName } from './types';

/**
 * The one place navigation structure is declared. Tabs, More sections, landing
 * route and fallbacks all come from here, so there is no `if (role === 'admin')`
 * in any screen.
 *
 * ------------------------------------------------------------------------
 * On "permissions"
 * ------------------------------------------------------------------------
 * The brief asks for `requires: Permission[]` resolved from permission strings
 * the server returns at login. **That system does not exist in this backend, and
 * this file does not pretend it does.** Two verified facts from
 * `docs/mobile-architecture-audit.md`:
 *
 *   - There is no login endpoint. Sign-in goes to Supabase directly, and the
 *     only thing that comes back is a JWT whose `app_metadata` holds `role` and
 *     `branchId`. No permission list is issued anywhere.
 *   - The single per-action gate in the whole system is `financeCan(role,
 *     permission, allowSuperAdminWrite)` — five finance permissions. Every other
 *     authorisation decision is role logic inside the API handlers, not data the
 *     client can read.
 *
 * So `Capability` below is deliberately small: it contains only gates this app
 * can actually evaluate truthfully. Inventing `orders.create` / `users.manage`
 * strings would produce a menu that looks permission-driven while really being
 * role-driven with extra steps — and it would drift from the server the first
 * time a handler changed.
 *
 * The declarative shape the brief wants is preserved: a tab lists what it
 * requires, and `resolveTabs` filters. When the backend grows real permissions,
 * widen `Capability` and `accessProfileFor` — no call site changes.
 *
 * ------------------------------------------------------------------------
 * This is UX, not authorization
 * ------------------------------------------------------------------------
 * Hiding a tab hides nothing. The API re-authorises every request against the
 * JWT, and the service-role key never leaves the server. Assume the client is
 * hostile; this file only decides what is convenient to reach.
 */

// ---------------------------------------------------------------------------
// Capabilities — only gates that are real
// ---------------------------------------------------------------------------

export type Capability =
  | `finance:${FinancePermission}`
  /** Signed in as the super admin. */
  | 'admin'
  /** The central production account. */
  | 'production'
  /** Carries a branchId, so branch-scoped queries return a shop. */
  | 'branch'
  /**
   * May read `/api/reports/*`.
   *
   * Not a guess: `reports.routes.ts` mounts the whole router behind
   * `requireRole('super_admin', 'branch_manager')`, so a `branch_user` gets a
   * 403 from every route under it — including `/summary`, which is the branch
   * dashboard's only data source. This is a capability rather than a role check
   * at the call site because two different surfaces depend on it (the Home tab
   * and the Reports row) and they must not disagree.
   */
  | 'reports';

/**
 * Everything navigation needs to know about who is signed in, resolved once.
 *
 * `allowSuperAdminWrite` mirrors the server-side finance setting of the same
 * name (default off). It is passed through rather than assumed so a Super Admin
 * sees finance as read-only unless the backend actually opened writes.
 */
export interface AccessProfile {
  role: UserRole;
  group: RoleGroup;
  branchId: string | null;
  capabilities: ReadonlySet<Capability>;
}

export function accessProfileFor(
  role: UserRole,
  branchId: string | null,
  allowSuperAdminWrite = false,
): AccessProfile {
  const caps = new Set<Capability>();

  if (role === 'super_admin') caps.add('admin');
  if (role === 'production_user') caps.add('production');
  // A branch account without a branchId is broken upstream, not branch-scoped.
  if (isBranchRole(role) && branchId) caps.add('branch');
  // Mirrors requireRole('super_admin', 'branch_manager') on /api/reports.
  if (role === 'super_admin' || role === 'branch_manager') caps.add('reports');

  const financePerms: FinancePermission[] = ['view', 'create', 'approve', 'adjust', 'configure'];
  for (const p of financePerms) {
    if (financeCan(role, p, allowSuperAdminWrite)) caps.add(`finance:${p}`);
  }

  return { role, group: roleGroupFor(role), branchId, capabilities: caps };
}

function satisfies(profile: AccessProfile, requires: readonly Capability[] | undefined): boolean {
  if (!requires || requires.length === 0) return true;
  return requires.every(c => profile.capabilities.has(c));
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

/**
 * Labels live behind keys rather than as literals in the config.
 *
 * The app has no i18n runtime today and adding one is its own task, so this is
 * not `t('nav.orders')`. It is the indirection that makes that change a single
 * edit here instead of a sweep: every user-visible navigation string in the app
 * is in this one record.
 */
export const NAV_LABELS = {
  home: 'Home',
  dashboard: 'Dashboard',
  orders: 'Orders',
  products: 'Products',
  reports: 'Reports',
  sales: 'Sales',
  stock: 'Stock',
  preparation: 'Preparation',
  delivery: 'Delivery',
  expenses: 'Expenses',
  more: 'More',
  ledger: 'Ledger',
  income: 'Income',
  closing: 'Closing',
  production: 'Production',
  newOrder: 'New Order',
  newSale: 'New Sale',
  addExpense: 'Add Expense',
  users: 'Users',
  categories: 'Categories',
  vendors: 'Vendors',
  branches: 'Branches',
  partnerExpenses: 'Partner Expenses',
  syncCenter: 'Sync Center',
  notifications: 'Notifications',
  help: 'Help & Support',
  settings: 'Settings',
  profile: 'Profile',
  logout: 'Sign out',
} as const;

export type LabelKey = keyof typeof NAV_LABELS;

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

/**
 * A badge names a source of real state, never a number baked into config.
 *
 * Only sources backed by state the app actually holds are listed. `syncPending`
 * and `syncAttention` read `useSyncStore`, which the sync engine keeps current.
 *
 * The brief also asks for "waiting orders" and "orders awaiting production"
 * badges. There is no live count for either — it would need a polled query per
 * role, and a badge fed by a stale or absent query is exactly the badge that
 * teaches staff to ignore all badges. Add `ordersWaiting` here once a real
 * counter exists; the tab config already has the slot.
 */
export type BadgeSource = 'syncAttention';

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

/**
 * One tab, as data.
 *
 * ------------------------------------------------------------------------
 * Why there is no `stack: React.ComponentType` field
 * ------------------------------------------------------------------------
 * The brief's `TabConfig` carries its own component. It is not here, and the
 * reason is the same one that makes `resolveTabScreen(role, name)` key on both
 * arguments: **a tab name does not identify a screen in this app.** "Sales" at
 * the production counter posts to a different endpoint and offers a `staff`
 * payment method a branch sale must never show; "Orders" is customer orders for
 * an admin and branch demands on central production for the production account;
 * "Home" is four different dashboards. A single `stack` per tab entry would
 * therefore have to be repeated per role anyway — the same component named in
 * four places, which is the duplication this file exists to prevent.
 *
 * Keeping components out also keeps this module **pure data**: it imports no
 * React and no screen, so the surface tests resolve every role's whole
 * navigation tree without mounting anything, and screens can import these types
 * without a cycle back into the registry. `screenRegistry.tsx` owns the
 * (role, tab) → component mapping and is the one place that imports screens.
 *
 * ------------------------------------------------------------------------
 * `requires` holds capabilities, not backend permission strings
 * ------------------------------------------------------------------------
 * The brief types this `Permission[]` of "real backend permission strings".
 * There are none — see the header of this file. `Capability` is the honest
 * subset the client can evaluate truthfully, and the declarative shape is
 * identical, so widening it is the whole change if the backend ever issues a
 * permission list.
 *
 * It is optional rather than required: most tabs are gated by nothing, and
 * `requires: []` on every one of them is noise that reads as though a gate were
 * intended. `satisfies()` treats absent and empty the same way.
 */
export interface TabConfig {
  /** Route name inside the role's tab navigator. Typed, not a free string. */
  name: AppTabName;
  icon: IconKey;
  label: LabelKey;
  badge?: BadgeSource;
  requires?: readonly Capability[];
}

/**
 * Four daily-operations tabs per role, plus More. Five is the ceiling: past that
 * the targets get too narrow to hit one-handed and the labels truncate.
 *
 * The four are chosen to mirror `PRIMARY_NAV` in the web client's
 * `src/utils/sidebar.ts`, so a staff member moving between the phone and the
 * desktop finds the same things in the same order.
 *
 * One deliberate change from the previous mobile tab set: **New Order is no
 * longer a tab.** It is a create action, and create screens belong inside the
 * stack that owns the resource — it is now a modal on `OrdersStack`, reachable
 * from the Orders list and from the dashboard quick actions. A tab whose only
 * job is to open a form means the resource it creates has no list to return to.
 */
export const ROLE_TABS: Record<UserRole, readonly TabConfig[]> = {
  super_admin: [
    { name: 'Home', icon: 'home', label: 'home' },
    { name: 'Orders', icon: 'orders', label: 'orders' },
    { name: 'Products', icon: 'products', label: 'products' },
    { name: 'Reports', icon: 'reports', label: 'reports' },
  ],
  branch_manager: branchTabs(),
  branch_user: branchTabs(),
  /**
   * The production floor's day, in the order it happens: what came in, what is
   * being made, what goes out.
   *
   * Preparation and Delivery are the two things this account does all day and
   * they are separate resources — `GET /api/production/queue` (`pending |
   * preparing | ready`) and `GET /api/production-orders` (the branch demands it
   * dispatches). Stock moved to More: production reads it to check a pool
   * balance, which is a lookup rather than a station on the floor.
   */
  production_user: [
    { name: 'Home', icon: 'home', label: 'dashboard' },
    { name: 'Orders', icon: 'orders', label: 'orders' },
    { name: 'Preparation', icon: 'preparation', label: 'preparation' },
    { name: 'Delivery', icon: 'delivery', label: 'delivery' },
  ],
  finance_admin: financeTabs(),
  finance_manager: financeTabs(),
  accountant: financeTabs(),
  finance_auditor: financeTabs(),
};

/**
 * The branch tab set: Home · Orders · Sales · Stock, then More.
 *
 * Declared once for both branch roles on purpose. A `branch_user` is a shift
 * account carrying its manager's `branchId` — the same shop, a different pair of
 * hands — so the two must not drift into two hand-maintained lists. Every
 * difference between them comes from a capability the server actually enforces.
 *
 * Home is the one such difference, and it is gated rather than omitted: the
 * branch dashboard's only data source is `GET /api/reports/summary`, and the
 * server mounts every `/api/reports` route behind
 * `requireRole('super_admin', 'branch_manager')`. Giving a shift account a Home
 * tab would land it on a 403 error state as the first thing it sees at open, so
 * the tab is filtered out and the shift opens on Orders — the first tab it can
 * reach. When a shift dashboard exists that reads something a `branch_user` may
 * actually fetch, drop the `requires` here and both roles land on it.
 */
function branchTabs(): readonly TabConfig[] {
  return [
    { name: 'Home', icon: 'home', label: 'home', requires: ['reports'] },
    { name: 'Orders', icon: 'orders', label: 'orders' },
    { name: 'Sales', icon: 'sales', label: 'sales' },
    { name: 'Stock', icon: 'stock', label: 'stock' },
  ];
}

/**
 * Finance's four daily tabs.
 *
 * Every one is gated on `finance:view`, which is the only permission the
 * backend really issues for this module: each `/api/finance/*` handler sits
 * behind `requireFinance(...)`, and `view` is the floor for all of them. A
 * `finance_auditor` therefore keeps the whole tab bar and loses the write
 * actions *inside* each screen — which is exactly what an auditor is.
 *
 * **Reports here is not the admin's Reports.** The tab name is shared but the
 * resource is not: this one is `GET /api/finance/reports`
 * (`requireFinance('view')`), while the admin tab of the same name reads
 * `/api/reports`, which is `requireRole('super_admin', 'branch_manager')` and
 * would 403 a finance account. `resolveTabScreen` keys on the role for exactly
 * this reason — never point a finance tab at the admin screen.
 *
 * Note: no tab points at `LedgerScreen` any more. The ledger book is reached
 * through Income, Expenses and Reports; if it should keep a front door, it
 * belongs as a More row rather than a fifth tab.
 */
function financeTabs(): readonly TabConfig[] {
  return [
    { name: 'Home', icon: 'home', label: 'dashboard', requires: ['finance:view'] },
    { name: 'Income', icon: 'income', label: 'income', requires: ['finance:view'] },
    { name: 'Expenses', icon: 'expenses', label: 'expenses', requires: ['finance:view'] },
    { name: 'Reports', icon: 'reports', label: 'reports', requires: ['finance:view'] },
  ];
}

/** The More tab, appended to every role. Declared once so it cannot drift. */
export const MORE_TAB: TabConfig = {
  name: 'More',
  icon: 'more',
  label: 'more',
  badge: 'syncAttention',
};

// ---------------------------------------------------------------------------
// More
// ---------------------------------------------------------------------------

/**
 * A More row is a **destination, always**.
 *
 * There used to be an action variant here so sign-out could be a row. That is
 * what let sign-out exist in the account panel *and* in More — two paths, and
 * they had drifted into different behaviour: the More one confirmed and named
 * the queue depth, the panel one signed out silently. The single-path rule is
 * now structural rather than remembered: a row carries a `MoreRouteName` or it
 * does not typecheck, so an action cannot be added back to this menu without
 * deliberately reopening the union.
 *
 * Actions belong in the account panel (`AccountDrawer.tsx`), which owns exactly
 * the things that are read-only or an action and never a destination. See
 * `ACCOUNT_PANEL` below and `docs/navigation.md`.
 */
export interface MoreItem {
  route: MoreRouteName;
  icon: IconKey;
  label: LabelKey;
  requires?: readonly Capability[];
  badge?: BadgeSource;
}

/** Stable identity for a row. Used as a React key and by the surface tests. */
export function moreItemKey(item: MoreItem): string {
  return item.route;
}

export interface MoreSection {
  /** Section heading. `null` renders an unheaded group at the top. */
  title: string | null;
  items: readonly MoreItem[];
}

/**
 * Everything that is not a daily-operations tab.
 *
 * Nothing here also appears in the tab bar or in the account drawer — that
 * single-path rule is the whole reason this restructure happened, and
 * `navigationSurface.test.ts` asserts it for every role.
 */
export const MORE_SECTIONS: Record<UserRole, readonly MoreSection[]> = {
  // The admin owns every surface in the product, which is exactly why the tab
  // bar holds only four of them. Everything else an admin reaches occasionally
  // — the catalogue side of the business, the shop-floor screens they audit
  // rather than operate — lives here.
  super_admin: [
    {
      title: 'Manage',
      items: [
        { route: 'Users', icon: 'users', label: 'users' },
        { route: 'Categories', icon: 'categories', label: 'categories' },
        { route: 'Vendors', icon: 'vendors', label: 'vendors' },
        { route: 'Branches', icon: 'branches', label: 'branches' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { route: 'Sales', icon: 'sales', label: 'sales' },
        { route: 'Stock', icon: 'stock', label: 'stock' },
        { route: 'Expenses', icon: 'expenses', label: 'expenses' },
        { route: 'Production', icon: 'production', label: 'production' },
      ],
    },
  ],
  branch_manager: branchMore(),
  branch_user: branchMore(),
  production_user: [
    {
      title: 'Operations',
      items: [
        { route: 'Stock', icon: 'stock', label: 'stock' },
        { route: 'Reports', icon: 'reports', label: 'reports' },
      ],
    },
  ],
  finance_admin: financeMore(),
  finance_manager: financeMore(),
  accountant: financeMore(),
  finance_auditor: financeMore(),
};

/**
 * The branch More list, shared by both branch roles for the same reason
 * `branchTabs` is.
 *
 * Reports carries the same `reports` gate as the Home tab — one capability, both
 * surfaces, so they cannot disagree about who may read `/api/reports`. A branch
 * manager is auto-scoped to their own branch server-side and sends no
 * `branchId`, so this is the admin's Reports screen showing one shop.
 */
function branchMore(): readonly MoreSection[] {
  return [
    {
      title: 'Operations',
      items: [
        { route: 'Expenses', icon: 'expenses', label: 'expenses' },
        { route: 'Reports', icon: 'reports', label: 'reports', requires: ['reports'] },
      ],
    },
  ];
}

/**
 * Finance's More list — and the two rows that are deliberately NOT in it.
 *
 * **Stock and Sales are shop-floor surfaces a finance account cannot use.**
 * Checked against the server rather than assumed:
 *
 *   - Sales is the POS. `POST /api/orders/pos` is
 *     `requireRole('super_admin', ...BRANCH_ROLES)` and `POST
 *     /api/orders/production-sale` is `super_admin` + `production_user`. A
 *     finance user can ring a whole cart up and only find out at checkout —
 *     and because every write here is offline-first, the sale would queue and
 *     then park as a failed row rather than fail in front of them.
 *   - Stock is `GET /api/stock`, which has no implicit branch for a non-branch
 *     role and answers 400 "Branch context required" without a `branchId`. A
 *     finance account carries none (`app_metadata.branchId` is null), so
 *     `useStock` keeps the query disabled and the screen would never fill.
 *     `GET /api/stock/audit` refuses outright — 403 for anyone who is neither
 *     branch nor super admin.
 *
 * There is no finance-scoped stock or sales resource to point them at either;
 * the branch-side numbers finance actually needs come through Reports
 * (`/api/finance/reports`) and the branch-share screens. Listing rows that
 * cannot answer is how staff learn to distrust the whole menu, so they are
 * omitted rather than shown-and-refused. `navigationSurface.test.ts` asserts
 * their absence for all four finance roles.
 */
function financeMore(): readonly MoreSection[] {
  return [
    {
      title: 'Ledger',
      items: [
        {
          route: 'PartnerExpenses',
          icon: 'partnerExpenses',
          label: 'partnerExpenses',
          requires: ['finance:view'],
        },
      ],
    },
  ];
}

/**
 * Appended to every role's More list. These are universal, so they are declared
 * once here rather than repeated per role — repetition is how the four copies
 * of a menu start.
 */
const MORE_COMMON: readonly MoreSection[] = [
  {
    title: 'App',
    items: [
      { route: 'SyncCenter', icon: 'sync', label: 'syncCenter', badge: 'syncAttention' },
      /**
       * Behind a placeholder, deliberately and visibly.
       *
       * There is still no notification library and no inbox endpoint. What the
       * row opens says "Not built yet — Phase 9" rather than showing an empty
       * list, which is the project's standing rule: an unbuilt screen must never
       * be mistakable for an empty one. It carries no badge for the same reason
       * `ordersWaiting` does not exist — there is no count to show, and a badge
       * fed by nothing teaches staff to ignore every badge in the app.
       */
      { route: 'Notifications', icon: 'notifications', label: 'notifications' },
      { route: 'Profile', icon: 'profile', label: 'profile' },
      { route: 'Help', icon: 'help', label: 'help' },
      { route: 'Settings', icon: 'settings', label: 'settings' },
    ],
  },
];

// ---------------------------------------------------------------------------
// The account panel
// ---------------------------------------------------------------------------

/**
 * What the account panel owns, declared beside the tabs and the More list so the
 * single-path rule can be **checked** instead of trusted.
 *
 * This is not a menu — it is the inventory `navigationSurface.test.ts` asserts
 * against, and every entry is read-only state or an action. None of them is a
 * `MoreRouteName`, and that is the invariant: the moment someone gives the panel
 * a row that pushes a screen, that entry has to be named here and the test fails
 * because the name collides with a More route.
 *
 * Sign-out lives here and **only** here. It is the one control a mis-tap costs
 * something — it drops the local session while the queue may still hold the only
 * copy of a transaction — so it goes through `useSignOut()`, which reads the real
 * unsynced count out of the database and confirms before dropping the session.
 * It used to be a More row as well, with a second, separately-written confirm;
 * see `docs/navigation.md`.
 */
export const ACCOUNT_PANEL = ['identity', 'branch', 'connection', 'appearance', 'signOut'] as const;

export type AccountPanelEntry = (typeof ACCOUNT_PANEL)[number];

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

/**
 * A one-tap shortcut on a dashboard.
 *
 * ------------------------------------------------------------------------
 * Quick actions are accelerators, NOT a fifth surface
 * ------------------------------------------------------------------------
 * The whole point of the tabs/More split is that no screen is reachable from two
 * surfaces. Quick actions would break that immediately if they could name a
 * destination of their own — they would become a third menu, drifting from the
 * other two exactly as the drawer once did.
 *
 * So an action may only point at somewhere the role **already has**: a tab it
 * already carries, or a screen inside one. `quickActionsFor` drops anything
 * that fails that test, and `navigationSurface.test.ts` asserts nothing is ever
 * dropped — a dropped action means the config named a place the role cannot go,
 * which is a bug in this file rather than something to render.
 *
 * That is why they are not in the single-path inventory alongside tabs, More and
 * the account panel: they add no destination. They are a shorter path to one.
 */
export interface QuickAction {
  /** The tab the action lands in. Must be one this role has. */
  tab: AppTabName;
  /** A screen inside that tab's stack — the create modal, or a More row. */
  screen?: string;
  icon: IconKey;
  label: LabelKey;
  requires?: readonly Capability[];
}

/**
 * Per role group, in the order they are used during a shift.
 *
 * **Only `branch` is defined.** These are the four jobs a branch actually does
 * all day — ring up a sale, order from production, log an expense, check stock —
 * and that list came from the brief, not from arranging four plausible icons.
 * The other three groups get none until someone who works that role says what
 * their four are. A dashboard with no quick actions is honest; a dashboard with
 * four guesses on it trains people to ignore the row, and it is the row the
 * brief says matters more than the charts.
 */
export const QUICK_ACTIONS: Record<RoleGroup, readonly QuickAction[]> = {
  branch: [
    { tab: 'Sales', icon: 'sales', label: 'newSale' },
    { tab: 'Orders', screen: 'CreateOrder', icon: 'orders', label: 'newOrder' },
    { tab: 'More', screen: 'Expenses', icon: 'expenses', label: 'addExpense' },
    { tab: 'Stock', icon: 'stock', label: 'stock' },
  ],
  admin: [],
  production: [],
  finance: [],
};

/**
 * The actions this profile can actually reach, in config order.
 *
 * Both halves of the reachability test matter: the tab has to survive
 * `tabsFor`, and a `screen` naming a More row has to survive the capability
 * filter in `moreSectionsFor`. A `branch_user` with no `reports` capability is
 * the case that makes this real — it must never be offered a card into a screen
 * the API will 403.
 */
export function quickActionsFor(profile: AccessProfile): readonly QuickAction[] {
  const tabs = new Set(tabsFor(profile).map(t => t.name));
  const moreRoutes = new Set(
    moreSectionsFor(profile).flatMap(section =>
      section.items.map(item => item.route as string),
    ),
  );

  return (QUICK_ACTIONS[profile.group] ?? []).filter(action => {
    if (!satisfies(profile, action.requires)) return false;
    if (!tabs.has(action.tab)) return false;
    // A screen inside the More stack is only there if its row is.
    if (action.tab === 'More' && action.screen) return moreRoutes.has(action.screen);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * The minimal shell for a role the app does not recognise.
 *
 * A role that reaches here is a backend/client mismatch — a new `user_role`
 * value shipped before the app knew about it. The response is Home + More and a
 * log, never a crash and never the admin set: failing open on an unknown role is
 * how a client hands someone the wrong menu.
 */
const FALLBACK_TABS: readonly TabConfig[] = [{ name: 'Home', icon: 'home', label: 'home' }];

export function tabsFor(profile: AccessProfile): readonly TabConfig[] {
  const declared = ROLE_TABS[profile.role] as readonly TabConfig[] | undefined;
  const base = declared ?? FALLBACK_TABS;
  const allowed = base.filter(t => satisfies(profile, t.requires));
  // Filtering to nothing would leave a navigator with zero screens, which
  // React Navigation throws on. Home is always reachable.
  const tabs = allowed.length > 0 ? allowed : FALLBACK_TABS;
  return [...tabs, MORE_TAB];
}

export function moreSectionsFor(profile: AccessProfile): readonly MoreSection[] {
  const declared = (MORE_SECTIONS[profile.role] as readonly MoreSection[] | undefined) ?? [];
  return [...declared, ...MORE_COMMON]
    .map(section => ({
      ...section,
      items: section.items.filter(i => satisfies(profile, i.requires)),
    }))
    .filter(section => section.items.length > 0);
}

/** The tab a role lands on after sign-in. */
export function landingTabFor(profile: AccessProfile): AppTabName {
  const first = tabsFor(profile)[0];
  // tabsFor never returns empty, but the type says it might.
  return first ? first.name : 'Home';
}

export function isKnownRole(role: string): role is UserRole {
  return Object.prototype.hasOwnProperty.call(ROLE_TABS, role);
}
