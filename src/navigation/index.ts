/**
 * Navigation barrel.
 *
 * Features must NOT import this — they take `./routes`, the param-list types,
 * and `./helpers` directly. Pulling the barrel into a screen would drag every
 * navigator (and through them every other feature) into that screen's module
 * graph, which is how a require cycle starts.
 */

export { RootNavigator } from './RootNavigator';
export { AppNavigator } from './AppNavigator';
export { AuthNavigator } from './AuthNavigator';

export { navigationRef, isNavigationReady, navigateIfReady, resetToTab, openNotification, landingTabFrom } from './helpers';
export type { NotificationOutcome } from './helpers';

export { isBranchRole, isFinanceRole, roleGroupFor } from './roleNavigation';
export type { RoleGroup } from './roleNavigation';

export * from './routes';
