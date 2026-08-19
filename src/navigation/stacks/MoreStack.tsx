import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MoreScreen } from '@/screens/more/MoreScreen';
import { SyncCenterScreen } from '@/screens/sync/SyncCenterScreen';
import { moreSectionsFor, NAV_LABELS, type AccessProfile } from '../roleConfig';
import { placeholderFor, resolveMoreScreen, type ScreenComponent } from '../screenRegistry';

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

  const destinations = sections.flatMap(section =>
    section.items.map(item => {
      const label = NAV_LABELS[item.label];
      let component: ScreenComponent;

      if (item.route === 'SyncCenter') {
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
        component = resolveMoreScreen(profile.role, item.route) ?? placeholderFor(item.route, label);
      }

      return { name: item.route, component };
    }),
  );

  function MoreStack(): React.ReactElement {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MoreIndex" component={Index} />
        {destinations.map(d => (
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
