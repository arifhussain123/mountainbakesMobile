import React, { useCallback, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { MBTabBar } from './MBTabBar';
import { NAV_LABELS, tabsFor, type AccessProfile } from './roleConfig';
import { placeholderFor, resolveTabScreen } from './screenRegistry';
import { createTabStack } from './stacks/createTabStack';
import { makeMoreStack } from './stacks/MoreStack';
import { makeOrdersStack } from './stacks/OrdersStack';
import { makeProductsStack } from './stacks/ProductsStack';
import { makeReportsStack } from './stacks/ReportsStack';
import { makeSalesStack } from './stacks/SalesStack';
import { makeStockStack } from './stacks/StockStack';
import { TAB_ROOT_ROUTE } from './types';

const Tab = createBottomTabNavigator();

/**
 * The role's tab bar. **One component, not one per role.**
 *
 * Four copies of a tab navigator drift inside a month — a padding fix lands in
 * the branch copy, an accessibility label in the admin copy, and by the time
 * anyone notices, the four roles have four different bars. Everything that
 * differs between roles is data in `roleConfig`, so this file has no role name
 * in it at all.
 *
 * This file assembles navigators; `MBTabBar` draws the bar. The split is why
 * there are almost no `tabBar*` options below: a custom `tabBar` renders the
 * whole row itself, so `tabBarActiveTintColor`, `tabBarStyle` and friends would
 * be dead configuration that reads as if it were still in force. `title` stays,
 * because the bar takes the visible label from it.
 *
 * Hiding a tab is not authorization. The API re-authorises every request against
 * the JWT; this only decides what is convenient to reach.
 */
export function RoleTabs({ profile }: { profile: AccessProfile }): React.ReactElement {
  const tabs = useMemo(() => tabsFor(profile), [profile]);

  /**
   * Screens are assembled here rather than in the JSX below, so the stack
   * components keep a stable identity across renders. Building one during render
   * makes each pass a new component type, which remounts the whole tab and loses
   * scroll position, form state, and any in-flight request.
   */
  const screens = useMemo(() => {
    return tabs.map(tab => {
      const label = NAV_LABELS[tab.label];

      let component: React.ComponentType;
      if (tab.name === 'More') {
        component = makeMoreStack(profile);
      } else if (tab.name === 'Orders') {
        component = makeOrdersStack(profile.role);
      } else if (tab.name === 'Products') {
        component = makeProductsStack(profile.role);
      } else if (tab.name === 'Sales') {
        /* Not the shared factory: the till is a modal inside this tab, so the
           register keeps its scroll position and its day underneath it. */
        component = makeSalesStack(profile.role);
      } else if (tab.name === 'Stock') {
        component = makeStockStack(profile.role);
      } else if (tab.name === 'Reports') {
        /* Not the shared factory: Reports pushes three statements. Note the
           finance roles also have a tab called "Reports" — a different resource
           behind the same name — and `resolveTabScreen` keys on the role, so
           this factory hands a finance account its own index and registers the
           admin statements only when that index resolved. */
        component = makeReportsStack(profile.role);
      } else {
        const root = resolveTabScreen(profile.role, tab.name) ?? placeholderFor(tab.name, label);
        component = createTabStack(TAB_ROOT_ROUTE[tab.name], root);
      }

      // Labels stay visible in the bar. An icon-only bar fails for new staff,
      // who have not yet learned which glyph is which, and it fails for anyone
      // relying on a screen reader landing on the label.
      const options: BottomTabNavigationOptions = { title: label };

      return { name: tab.name, component, options };
    });
  }, [tabs, profile]);

  /**
   * `tabBar` is a render prop React Navigation calls as a plain function, not a
   * component it mounts — so the element it returns is what matters, and that
   * element's type is `MBTabBar`, declared at module scope. The bar therefore
   * keeps its identity (and its indicator position) across renders even though
   * this arrow is new each time.
   */
  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => <MBTabBar {...props} tabs={tabs} />,
    [tabs],
  );

  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        /**
         * A tab is mounted the first time it is opened, not at sign-in.
         *
         * The default, but stated: a role has four tabs plus More, each a stack
         * whose root fires its own queries on mount. Mounting all five up front
         * turns opening the app into five parallel requests on a shop's
         * connection, four of which nobody asked for.
         */
        lazy: true,
        /**
         * A tab that is not on screen stops re-rendering.
         *
         * Every tab root subscribes to something that moves without the user:
         * the network store, the sync store's pending count, a query refetching
         * on reconnect. Without this, a drain finishing re-renders the
         * dashboard, the catalogue and the stock list as well as the screen
         * actually being looked at — work whose only visible effect is that the
         * foreground screen dropped frames while it happened. The state is kept;
         * only the rendering is deferred until the tab is focused again.
         */
        freezeOnBlur: true,
        // Tab switches are instant, and that is stated rather than inherited.
        // React Navigation 7 defaults to `'none'` here, but a default is not a
        // decision — a minor version that changed it would quietly put a
        // cross-fade between a cashier and the sale screen. Switching tabs is
        // not travel: the four tabs are four places the user is already in, so
        // there is nothing for a transition to explain, only a delay to sit
        // through. The moving indicator in `MBTabBar` is the whole animation
        // this bar gets.
        animation: 'none',
      }}>
      {screens.map(s => (
        <Tab.Screen key={s.name} name={s.name} component={s.component} options={s.options} />
      ))}
    </Tab.Navigator>
  );
}
