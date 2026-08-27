import { getStateFromPath, type LinkingOptions } from '@react-navigation/native';
import { landingTabFor, tabsFor, type AccessProfile } from './roleConfig';
import type { AppTabName, AppTabParamList } from './types';

/**
 * Deep links and notification routing.
 *
 * ---------------------------------------------------------------------------
 * What works today, and what does not
 * ---------------------------------------------------------------------------
 * The mapping and the permission guard below are real and unit-tested. The
 * transport is not yet there:
 *
 *   - **Android**: `mountainbakes://` is registered in `AndroidManifest.xml`, so
 *     an `adb shell am start -a android.intent.action.VIEW -d ...` link resolves.
 *   - **iOS**: nothing is registered. The iOS project has never been built (no
 *     CocoaPods run, development is on Linux), so any iOS claim here would be
 *     unverified. `Info.plist` needs a `CFBundleURLTypes` entry before this
 *     works there.
 *   - **Push notifications**: there is no notification library in the project —
 *     no Firebase, no notifee. `routeForNotification` is the resolver a handler
 *     would call, written and tested ahead of the transport, not evidence that
 *     notifications are wired up.
 */

export const DEEP_LINK_PREFIXES = ['mountainbakes://', 'https://app.mountainbakes.com'] as const;

/**
 * URL → route.
 *
 * Paths mirror the web client's, so a link pasted from a desktop session opens
 * the same thing on the phone. A screen that lives inside a tab's stack is
 * addressed through that tab, which is what gives the pushed screen a real back
 * path to its list instead of stranding the user in a dead-end modal.
 */
export const linkingConfig: LinkingOptions<AppTabParamList>['config'] = {
  screens: {
    Home: { screens: { HomeIndex: 'home' } },
    Orders: {
      screens: {
        OrdersList: 'orders',
        OrderDetail: 'orders/:orderId',
        CreateOrder: 'orders/new',
      },
    },
    Sales: { screens: { SalesList: 'sales', NewSale: 'sales/new' } },
    Stock: { screens: { StockList: 'stock', StockReturn: 'stock/return' } },
    // The production floor's two stages, on the same paths the web client uses.
    Preparation: { screens: { PreparationQueue: 'production/queue' } },
    Delivery: { screens: { DeliveryList: 'production/delivery' } },
    Products: {
      screens: {
        ProductsList: 'products',
        // `new` before `:productId`, or the create path resolves as a product
        // whose id is the literal string "new".
        ProductForm: 'products/new',
        ProductDetail: 'products/:productId',
        PriceChange: 'products/:productId/price',
        PriceHistory: 'products/:productId/price-history',
      },
    },
    Reports: { screens: { ReportsIndex: 'reports' } },
    Ledger: { screens: { LedgerIndex: 'finance/ledger' } },
    Income: { screens: { IncomeIndex: 'finance/income' } },
    Expenses: { screens: { ExpensesList: 'finance/expenses' } },
    More: {
      screens: {
        MoreIndex: 'more',
        SyncCenter: 'sync',
        Users: 'users',
        Categories: 'categories',
        Vendors: 'vendors',
        Branches: 'branches',
        Closing: 'closing',
        PartnerExpenses: 'finance/partner-expenses',
        Production: 'production',
        Settings: 'settings',
        Help: 'help',
        Profile: 'profile',
        // Registered even though the screen is still a placeholder: every More
        // destination has a path, and the one that does not is the one nobody
        // remembers to add when the screen lands.
        Notifications: 'notifications',
      },
    },
  },
};

export function buildLinking(profile: AccessProfile): LinkingOptions<AppTabParamList> {
  return {
    prefixes: [...DEEP_LINK_PREFIXES],
    config: linkingConfig,
    /**
     * The permission guard.
     *
     * A link naming a tab this role does not have would otherwise push a screen
     * with no tab behind it — the user lands somewhere with no way back and, for
     * a role that cannot use it, nothing to see. Those links resolve to the
     * role's landing tab instead.
     *
     * **Not a literal `Home`.** A `branch_user` has no Home tab — the branch
     * dashboard's only source is `/api/reports/summary`, which the API refuses a
     * shift account — so resolving to `Home` would target a route that role's
     * navigator does not contain, and the link would land nowhere at all. The
     * fallback has to be computed from the same config that built the tabs.
     *
     * This is still not authorization. The API re-authorises every request; a
     * caller who hand-crafts a link gains nothing but a screen that returns 403.
     */
    getStateFromPath: (path, options) => {
      const state = getStateFromPath(path, options);
      if (!state) return state;

      const target = state.routes[0]?.name as AppTabName | undefined;
      if (target && !isTabAvailable(profile, target)) {
        return { routes: [{ name: landingTabFor(profile) }] };
      }
      return state;
    },
  };
}

export function isTabAvailable(profile: AccessProfile, tab: AppTabName): boolean {
  return tabsFor(profile).some(t => t.name === tab);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/** The payload shape a push handler would hand to `routeForNotification`. */
export interface NotificationPayload {
  type?: string;
  orderId?: string;
}

export interface NotificationRoute {
  tab: AppTabName;
  screen?: string;
  params?: Record<string, string>;
}

/**
 * Notification payload → route, or null when the role cannot reach it.
 *
 * Returning the tab as well as the screen is the point: a production-order push
 * opens the order **inside the Orders stack**, so the back gesture goes to the
 * order list rather than closing a modal onto whatever was underneath.
 */
export function routeForNotification(
  profile: AccessProfile,
  payload: NotificationPayload,
): NotificationRoute | null {
  switch (payload.type) {
    case 'production_order':
    case 'order': {
      if (!payload.orderId) return null;
      if (!isTabAvailable(profile, 'Orders')) return null;
      return { tab: 'Orders', screen: 'OrderDetail', params: { orderId: payload.orderId } };
    }
    case 'sync_failed':
      return { tab: 'More', screen: 'SyncCenter' };
    default:
      return null;
  }
}
