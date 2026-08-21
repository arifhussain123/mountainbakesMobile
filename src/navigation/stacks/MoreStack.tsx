import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CategoryFormScreen } from '@/screens/admin/CategoryFormScreen';
import { UserFormScreen } from '@/screens/admin/UserFormScreen';
import { MoreScreen } from '@/screens/more/MoreScreen';
import { SyncCenterScreen } from '@/screens/sync/SyncCenterScreen';
import { moreSectionsFor, NAV_LABELS, type AccessProfile } from '../roleConfig';
import { stackScreenOptions } from '../screenAnimations';
import { placeholderFor, resolveMoreScreen, type ScreenComponent } from '../screenRegistry';
import { MORE_DETAIL_SCREENS } from '../types';
import { REPORT_DETAIL_COMPONENTS } from './ReportsStack';

/**
 * Detail screens, by the name declared in `MORE_DETAIL_SCREENS`.
 *
 * They are not menu destinations — `MoreRouteName` excludes them — so they are
 * registered from the destination that owns them rather than from the menu. A
 * role without that destination gets neither, which keeps a deep link from
 * landing on an edit form for a resource the role cannot open.
 */
const DETAIL_COMPONENTS: Record<string, ScreenComponent> = {
  UserForm: UserFormScreen as unknown as ScreenComponent,
  CategoryForm: CategoryFormScreen as unknown as ScreenComponent,
  // Reports is a tab for the admin and a More row for a branch manager, so its
  // three statements are registered in two navigators. Spread from the same
  // record `ReportsStack` uses, or the two roles would drift into being offered
  // different statements from the same index.
  ...REPORT_DETAIL_COMPONENTS,
};

const Stack = createNativeStackNavigator();

/**
 * The More tab's stack: the index, plus every secondary destination.
 *
 * Destinations are registered from the same `moreSectionsFor(profile)` the index
 * renders, so a row can never point at a route the stack does not have — the two
 * cannot drift because they are the same list read twice.
 *
 * A destination without a built screen registers a placeholder that names the
 * phase it lands in. That is deliberate: an unbuilt screen must never look like
 * an empty one, and the row stays visible so the feature is discoverable before
 * it is finished.
 */
export function makeMoreStack(profile: AccessProfile): React.ComponentType {
  const sections = moreSectionsFor(profile);

  function Index(): React.ReactElement {
    return <MoreScreen profile={profile} />;
  }
  Index.displayName = 'MoreIndex';

  // Every More row is a destination — actions live in the account panel, so
  // there is nothing here to filter out. See docs/navigation.md.
  const destinations = sections.flatMap(section =>
    section.items.map(item => {
      const route = item.route;
      const label = NAV_LABELS[item.label];
      let component: ScreenComponent;

      if (route === 'SyncCenter') {
        // The one More destination that needs a prop rather than a placeholder.
        function SyncCenter({
          navigation,
        }: {
          navigation: { goBack: () => void };
        }): React.ReactElement {
          return <SyncCenterScreen onBack={() => navigation.goBack()} />;
        }
        SyncCenter.displayName = 'SyncCenter';
        component = SyncCenter as unknown as ScreenComponent;
      } else {
        component = resolveMoreScreen(profile.role, route) ?? placeholderFor(route, label);
      }

      return { name: route as string, component };
    }),
  );

  // Only for destinations this role actually has, and only when the destination
  // resolved to a real screen — a placeholder has nothing to navigate onward to.
  const details = sections.flatMap(section =>
    section.items.flatMap(item => {
      if (!resolveMoreScreen(profile.role, item.route)) return [];
      return (MORE_DETAIL_SCREENS[item.route] ?? []).flatMap(name => {
        const component = DETAIL_COMPONENTS[name];
        return component ? [{ name, component }] : [];
      });
    }),
  );

  function MoreStack(): React.ReactElement {
    const reduceMotion = useReducedMotion();
    // Memoised because a fresh options object makes React Navigation re-resolve
    // every screen's options on each render of the stack.
    const screenOptions = React.useMemo(() => stackScreenOptions(reduceMotion), [reduceMotion]);
    return (
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="MoreIndex" component={Index} />
        {destinations.map(d => (
          <Stack.Screen key={d.name} name={d.name} component={d.component} />
        ))}
        {details.map(d => (
          <Stack.Screen key={d.name} name={d.name} component={d.component} />
        ))}
      </Stack.Navigator>
    );
  }
  MoreStack.displayName = 'MoreStack';
  return MoreStack;
}

export function useMoreStack(profile: AccessProfile): React.ComponentType {
  return useMemo(() => makeMoreStack(profile), [profile]);
}
