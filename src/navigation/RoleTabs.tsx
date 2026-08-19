import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { MBIcon } from '@/components';
import { MBBadge } from '@/components/feedback/MBBadge';
import type { IconKey } from '@/constants/navigationIcons';
import { useSyncStore } from '@/store/syncStore';
import { iconStroke } from '@/theme/iconSizes';
import { useTheme } from '@/theme/ThemeProvider';
import { NAV_LABELS, tabsFor, type AccessProfile, type BadgeSource } from './roleConfig';
import { placeholderFor, resolveTabScreen } from './screenRegistry';
import { createTabStack } from './stacks/createTabStack';
import { makeMoreStack } from './stacks/MoreStack';
import { makeOrdersStack } from './stacks/OrdersStack';
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
 * Hiding a tab is not authorization. The API re-authorises every request against
 * the JWT; this only decides what is convenient to reach.
 */

interface Badge {
  count: number;
  tone: 'accent' | 'danger';
}

/**
 * Active state: heavier stroke, primary colour, and a pill behind the glyph.
 *
 * Defined at module scope. A component created during render is a new type on
 * every pass, which makes React unmount and remount the subtree beneath it.
 */
function TabGlyph({
  icon,
  focused,
  color,
  badge,
}: {
  icon: IconKey;
  focused: boolean;
  color: string;
  badge: Badge | null;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View>
      <View
        style={[
          styles.glyph,
          {
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.space.md,
            paddingVertical: theme.space.xs,
            // Lucide has no filled variants. Rather than mix in a second icon
            // family to get one, the active state is three signals at once:
            // colour, stroke weight, and this pill.
            backgroundColor: focused ? theme.colors.primarySoft : theme.colors.surface,
          },
        ]}>
        <MBIcon
          name={icon}
          size="tab"
          color={color}
          strokeWidth={focused ? iconStroke.active : iconStroke.inactive}
        />
      </View>
      {badge ? (
        <View style={styles.badge} pointerEvents="none">
          {/* The tab's own accessibilityLabel already announces the count, so
              the badge stays out of the reader rather than saying it twice. */}
          <MBBadge count={badge.count} tone={badge.tone} label="" />
        </View>
      ) : null}
    </View>
  );
}

export function RoleTabs({ profile }: { profile: AccessProfile }): React.ReactElement {
  const theme = useTheme();
  const tabs = useMemo(() => tabsFor(profile), [profile]);

  const pending = useSyncStore(s => s.pending);
  const needsAttention = useSyncStore(s => s.needsAttention);

  /**
   * Badges read live state and nothing else. `syncAttention` prefers failures
   * over queue depth — a parked row needs a person, a pending row needs a
   * network — and both clear themselves when the store clears.
   */
  const badgeFor = useMemo(() => {
    return (source: BadgeSource | undefined): Badge | null => {
      if (source !== 'syncAttention') return null;
      if (needsAttention > 0) return { count: needsAttention, tone: 'danger' };
      if (pending > 0) return { count: pending, tone: 'accent' };
      return null;
    };
  }, [needsAttention, pending]);

  /**
   * Screens are assembled here rather than in the JSX below, so the stack
   * components and the `tabBarIcon` renderers keep a stable identity across
   * renders. Building either during render makes each pass a new component
   * type, which remounts the whole tab and loses scroll position, form state,
   * and any in-flight request.
   */
  const screens = useMemo(() => {
    return tabs.map(tab => {
      const label = NAV_LABELS[tab.label];
      const badge = badgeFor(tab.badge);

      let component: React.ComponentType;
      if (tab.name === 'More') {
        component = makeMoreStack(profile);
      } else if (tab.name === 'Orders') {
        component = makeOrdersStack(profile.role);
      } else {
        const root = resolveTabScreen(profile.role, tab.name) ?? placeholderFor(tab.name, label);
        component = createTabStack(TAB_ROOT_ROUTE[tab.name], root);
      }

      const options: BottomTabNavigationOptions = {
        // Labels stay visible. An icon-only bar fails for new staff, who have
        // not yet learned which glyph is which, and it fails for anyone relying
        // on a screen reader landing on the label.
        title: label,
        // Without the count folded in, the reader announces "More" on a tab
        // that is visibly carrying a number.
        tabBarAccessibilityLabel: badge
          ? `${label}, ${badge.count} ${
              badge.tone === 'danger' ? 'need attention' : 'waiting to sync'
            }`
          : label,
        tabBarButtonTestID: `tab-${tab.name}`,
        // React Navigation's own `tabBarBadge` cannot be styled to the token
        // set, so the count rides in the icon slot instead.
        //
        // The lint rule cannot see that this is safe, so it is silenced with the
        // reason rather than left as a standing warning. `tabBarIcon` is a
        // render prop React Navigation requires — it is not a component
        // definition — and the real hazard the rule guards against (a new
        // component type each render, remounting the subtree) does not apply:
        // `TabGlyph` is declared at module scope, and this whole options object
        // is built inside `useMemo`, so its identity is stable between renders.
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ focused, color }) => (
          <TabGlyph icon={tab.icon} focused={focused} color={color} badge={badge} />
        ),
      };

      return { name: tab.name, component, options };
    });
  }, [tabs, profile, badgeFor]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        // Android raises the tab bar onto the keyboard otherwise, so a form's
        // submit button ends up behind it.
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          // Safe-area inset is applied by the navigator itself; this is the
          // content height above it.
          height: theme.layout.tabH,
        },
        tabBarLabelStyle: theme.type.caption,
        tabBarItemStyle: { paddingVertical: theme.space.xs },
      }}>
      {screens.map(s => (
        <Tab.Screen key={s.name} name={s.name} component={s.component} options={s.options} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  glyph: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: 0 },
});
