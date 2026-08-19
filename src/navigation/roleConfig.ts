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
  | 'branch';

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
  expenses: 'Expenses',
  more: 'More',
  ledger: 'Ledger',
  income: 'Income',
  closing: 'Closing',
  production: 'Production',
  newOrder: 'New Order',
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
const TABS: Record<UserRole, readonly TabConfig[]> = {
  super_admin: [
    { name: 'Home', icon: 'home', label: 'dashboard' },
    { name: 'Orders', icon: 'orders', label: 'orders' },
    { name: 'Products', icon: 'products', label: 'products' },
    { name: 'Reports', icon: 'reports', label: 'reports' },
  ],
  branch_manager: [
    { name: 'Home', icon: 'home', label: 'dashboard' },
    { name: 'Sales', icon: 'sales', label: 'sales' },
    { name: 'Orders', icon: 'orders', label: 'orders' },
    { name: 'Stock', icon: 'stock', label: 'stock' },
  ],
  // A shift account has no dashboard of its own — it works the counter. Closing
  // moves to More rather than holding a tab it reaches once a day.
  branch_user: [
    { name: 'Sales', icon: 'sales', label: 'sales' },
    { name: 'Orders', icon: 'orders', label: 'orders' },
    { name: 'Stock', icon: 'stock', label: 'stock' },
  ],
  production_user: [
    { name: 'Home', icon: 'home', label: 'dashboard' },
    { name: 'Orders', icon: 'orders', label: 'orders' },
    { name: 'Stock', icon: 'stock', label: 'stock' },
  ],
  finance_admin: financeTabs(),
  finance_manager: financeTabs(),
  accountant: financeTabs(),
  finance_auditor: financeTabs(),
};

function financeTabs(): readonly TabConfig[] {
  return [
    { name: 'Home', icon: 'home', label: 'dashboard', requires: ['finance:view'] },
    { name: 'Ledger', icon: 'ledger', label: 'ledger', requires: ['finance:view'] },
    { name: 'Income', icon: 'income', label: 'income', requires: ['finance:view'] },
    { name: 'Expenses', icon: 'expenses', label: 'expenses', requires: ['finance:view'] },
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

export interface MoreItem {
  route: MoreRouteName;
  icon: IconKey;
  label: LabelKey;
  requires?: readonly Capability[];
  badge?: BadgeSource;
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
const MORE: Record<UserRole, readonly MoreSection[]> = {
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
    { title: 'Operations', items: [{ route: 'Expenses', icon: 'expenses', label: 'expenses' }] },
  ],
  branch_manager: [
    {
      title: 'Operations',
      items: [
        { route: 'Expenses', icon: 'expenses', label: 'expenses' },
        { route: 'Closing', icon: 'closing', label: 'closing' },
      ],
    },
  ],
  branch_user: [
    {
      title: 'Operations',
      items: [
        { route: 'Expenses', icon: 'expenses', label: 'expenses' },
        { route: 'Closing', icon: 'closing', label: 'closing' },
      ],
    },
  ],
  production_user: [
    { title: 'Operations', items: [{ route: 'Sales', icon: 'sales', label: 'sales' }] },
  ],
  finance_admin: financeMore(),
  finance_manager: financeMore(),
  accountant: financeMore(),
  finance_auditor: financeMore(),
};

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
      { route: 'Settings', icon: 'settings', label: 'settings' },
      { route: 'Help', icon: 'help', label: 'help' },
    ],
  },
];

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
  const declared = TABS[profile.role] as readonly TabConfig[] | undefined;
  const base = declared ?? FALLBACK_TABS;
  const allowed = base.filter(t => satisfies(profile, t.requires));
  // Filtering to nothing would leave a navigator with zero screens, which
  // React Navigation throws on. Home is always reachable.
  const tabs = allowed.length > 0 ? allowed : FALLBACK_TABS;
  return [...tabs, MORE_TAB];
}

export function moreSectionsFor(profile: AccessProfile): readonly MoreSection[] {
  const declared = (MORE[profile.role] as readonly MoreSection[] | undefined) ?? [];
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
  return Object.prototype.hasOwnProperty.call(TABS, role);
}

/** Exposed for the surface tests, which assert across every role. */
export const __configForTests = { TABS, MORE, MORE_COMMON };
