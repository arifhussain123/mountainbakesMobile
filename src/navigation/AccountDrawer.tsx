import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';

import { MBBadge, MBIcon, MBLogo, MBPressable } from '@/components';
import { roleLabel } from '@/constants/roleLabels';
import { useSignOut } from '@/hooks/useSignOut';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSyncStore } from '@/store/syncStore';
import { iconStroke } from '@/theme/iconSizes';
import { layout, space } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { RoleTabs } from './RoleTabs';
import {
  drawerItemKey,
  drawerSectionsFor,
  NAV_LABELS,
  type AccessProfile,
  type BadgeSource,
  type DrawerDestination,
} from './roleConfig';

const Drawer = createDrawerNavigator();

/**
 * The navigation drawer.
 *
 * ---------------------------------------------------------------------------
 * It became a menu in v5, and that reversed a standing rule
 * ---------------------------------------------------------------------------
 * This file used to say, in bold, that the drawer was **not** a navigation
 * surface and that there was not one `navigate()` in it. That was the resolution
 * of a brief describing tabs *and* a drawer *and* a More tab: three routes to
 * one screen and three menus to keep in sync, so the drawer stopped being a menu
 * and became the account panel instead.
 *
 * v5 asks for the drawer back — a grouped index of the whole role, repeating
 * Dashboard, Orders and Stock from the bar deliberately, because a bar holding
 * four things is a set of shortcuts and not a map. The objection was never to
 * the pattern; it was to keeping three lists by hand.
 *
 * So the rule that replaced it is derivation, not prohibition:
 * `drawerSectionsFor(profile)` in `roleConfig.ts` **reads the tabs and the More
 * list** and groups them. There is no third list to drift, every row is by
 * construction somewhere the role can already reach, and
 * `navigationSurface.test.ts` asserts coverage and no duplicates rather than the
 * old no-two-surfaces check. See the long note on that function.
 *
 * ---------------------------------------------------------------------------
 * What stayed
 * ---------------------------------------------------------------------------
 * **Sign-out is here, only here**, and it still goes through `useSignOut()`,
 * which reads the real unsynced count out of the queue and confirms before
 * dropping the session. That duplication was real and shipped once: two
 * sign-out paths, and this one had no confirm at all.
 *
 * **Identity shows role and branch, not the e-mail address.** §7 rules out
 * e-mail, phone, token and ID, and the JWT carries no display name — so there is
 * nothing else to show without a new API call. v5 draws a person's name in the
 * footer; the app draws the role, because that is what it actually knows.
 *
 * **Appearance moved to Settings.** It was a control sitting in a list of
 * destinations, and v5's drawer has no controls in it. Light/dark and the brand
 * accent are preferences, which is what the Settings row is for.
 */

/** How the drawer navigates: into the tab navigator it wraps. */
const TABS_ROUTE = 'Tabs';

function AccountDrawerContent({
  profile,
  navigation,
}: DrawerContentComponentProps & { profile: AccessProfile }): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const claims = useAuthStore(s => s.claims);
  const { signOut, isSigningOut } = useSignOut();
  const isOnline = useNetworkStore(s => s.isOnline);

  const sections = useMemo(() => drawerSectionsFor(profile), [profile]);

  /**
   * Sign-out unmounts this whole tree, so there is no component left to show an
   * error in: a failure is logged and the local session is dropped either way.
   */
  const onSignOut = useCallback(() => {
    signOut().catch((err: unknown) => {
      console.warn('[auth] sign-out failed', err);
    });
  }, [signOut]);

  /**
   * A row goes to a tab, and optionally to a screen inside that tab's stack.
   *
   * The drawer wraps the tab navigator, so both hops are one `navigate` with a
   * nested `screen` — navigating to the tab and then pushing would show the tab
   * root for a frame before replacing it. The drawer closes itself: leaving it
   * open over the destination is how a user ends up tapping the same row twice.
   */
  const go = useCallback(
    (item: DrawerDestination) => {
      /* Cast at the boundary rather than typed through. The drawer navigator is
         created untyped (one screen, built from a render prop), so React
         Navigation infers `never` for its route params and a nested navigate
         cannot be expressed without a param list for every role's tab tree —
         which is the thing `roleConfig` exists to avoid declaring four times. */
      const params = item.screen
        ? { screen: item.tab, params: { screen: item.screen } }
        : { screen: item.tab };
      (navigation.navigate as (route: string, params?: unknown) => void)(TABS_ROUTE, params);
      navigation.closeDrawer();
    },
    [navigation],
  );

  const connection = isOnline ? 'Online' : 'Offline';

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.surface }]}>
      {/* Brand, not identity.

          v5 heads the drawer with the mark and the branch and puts the person in
          the footer beside Logout — which is the right way round for a menu: the
          top of a scrolling list is where the eye starts, and it should start on
          where you are rather than on who you are. `secondary` because chrome
          that has to outrank a list of rows is the ink's job in v4; a header
          painted in the ember reads as one enormous button. */}
      <View
        style={{
          backgroundColor: theme.colors.secondary,
          paddingTop: insets.top + theme.space.lg,
          paddingBottom: theme.space.lg,
          paddingHorizontal: theme.layout.screenPad,
        }}>
        <View style={[styles.row, { gap: theme.space.md }]}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill },
            ]}>
            <MBLogo size={38} />
          </View>
          <View style={[styles.flex, { gap: theme.space.hair }]}>
            <Text style={[theme.type.h2, { color: theme.colors.onSecondary }]}>Mountain Bakes</Text>
            {claims?.branchName ? (
              <Text style={[theme.type.caption, { color: theme.colors.onSecondaryMuted }]}>
                {claims.branchName}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <DrawerContentScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: theme.space.lg }]}>
        {sections.map(section => (
          <View key={section.title} style={{ paddingTop: theme.space.lg }}>
            <Text
              accessibilityRole="header"
              style={[
                theme.type.label,
                {
                  color: theme.colors.textMuted,
                  paddingHorizontal: theme.layout.screenPad,
                  paddingBottom: theme.space.xs,
                },
              ]}>
              {section.title}
            </Text>
            {section.items.map(item => (
              <DrawerRow key={drawerItemKey(item)} item={item} onPress={go} />
            ))}
          </View>
        ))}
      </DrawerContentScrollView>

      {/* The account footer: who is signed in, whether the phone can reach the
          server, and the one way out. Pinned below the scroller rather than
          inside it — a sign-out that moves as the menu grows is a sign-out
          somebody hits by accident. */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.colors.border,
            paddingHorizontal: theme.layout.screenPad,
            paddingTop: theme.space.md,
            paddingBottom: Math.max(insets.bottom, space.md) + space.md,
            gap: theme.space.md,
          },
        ]}>
        <View style={[styles.row, styles.flex, { gap: theme.space.md }]}>
          <View style={[styles.flex, { gap: theme.space.hair }]}>
            <Text style={[theme.type.cardTitle, { color: theme.colors.text }]}>
              {claims ? roleLabel(claims.role) : 'Signed out'}
            </Text>
            <View
              accessible
              accessibilityLabel={`Connection: ${connection}`}
              style={[styles.row, { gap: theme.space.tight }]}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isOnline ? theme.colors.success : theme.colors.offline,
                    borderRadius: theme.radius.pill,
                  },
                ]}
              />
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                {connection}
              </Text>
            </View>
          </View>

          <MBPressable
            onPress={onSignOut}
            disabled={isSigningOut}
            restOpacity={isSigningOut ? 0.5 : 1}
            accessibilityRole="button"
            accessibilityLabel={NAV_LABELS.logout}
            accessibilityState={{ disabled: isSigningOut }}
            testID="drawer-sign-out"
            style={[
              styles.logout,
              {
                minHeight: theme.layout.tapMin,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.dangerBg,
                paddingHorizontal: theme.space.lg,
                gap: theme.space.tight,
              },
            ]}>
            <MBIcon name="logout" size="action" color={theme.colors.danger} />
            <Text style={[theme.type.label, { color: theme.colors.danger }]}>
              {NAV_LABELS.logout}
            </Text>
          </MBPressable>
        </View>
      </View>
    </View>
  );
}

/**
 * Memoised, and it has to be: the drawer subscribes to the sync store for its
 * badges, so every drain tick re-renders the content. With a stable item and a
 * stable handler none of the rows re-render with it.
 */
const DrawerRow = React.memo(function DrawerRowView({
  item,
  onPress,
}: {
  item: DrawerDestination;
  onPress: (item: DrawerDestination) => void;
}): React.ReactElement {
  const theme = useTheme();
  const badge = useDrawerBadge(item.badge);
  const press = useCallback(() => onPress(item), [onPress, item]);
  const label = NAV_LABELS[item.label];

  return (
    <MBPressable
      onPress={press}
      accessibilityRole="link"
      // Without the count folded in, the reader announces a row that is visibly
      // carrying a number as though it were not.
      accessibilityLabel={
        badge
          ? `${label}, ${badge.count} ${badge.tone === 'danger' ? 'need attention' : 'waiting to sync'}`
          : label
      }
      testID={`drawer-${drawerItemKey(item)}`}
      style={[
        styles.item,
        {
          minHeight: theme.layout.tapMin,
          paddingHorizontal: theme.layout.screenPad,
          gap: theme.space.md,
        },
      ]}>
      <MBIcon
        name={item.icon}
        size="drawer"
        color={theme.colors.textMuted}
        strokeWidth={iconStroke.regular}
      />
      <Text style={[theme.type.bodyStrong, styles.flex, { color: theme.colors.text }]}>
        {label}
      </Text>
      {badge ? <MBBadge count={badge.count} tone={badge.tone} label="" /> : null}
    </MBPressable>
  );
});

/**
 * The live count behind a row, or nothing.
 *
 * Same rule the tab bar follows: failures outrank queue depth — a parked row
 * needs a person, a pending row only needs a network — and both clear when the
 * store clears, which is the property that keeps a badge worth believing. A
 * badge fed by nothing teaches staff to ignore every badge in the app, so a
 * source this does not recognise gets none.
 */
function useDrawerBadge(
  source: BadgeSource | undefined,
): { count: number; tone: 'accent' | 'danger' } | null {
  const pending = useSyncStore(s => s.pending);
  const needsAttention = useSyncStore(s => s.needsAttention);

  if (source !== 'syncAttention') return null;
  if (needsAttention > 0) return { count: needsAttention, tone: 'danger' };
  if (pending > 0) return { count: pending, tone: 'accent' };
  return null;
}

/**
 * The tabs, hidden from the accessibility tree while the drawer is open.
 *
 * Without this, the drawer is drawn over the tabs but the tabs are still what a
 * screen reader walks: TalkBack reads the screen underneath and never reaches
 * the menu. It is a visual overlay, not an accessibility one, until it is told
 * otherwise. Both props are needed — `accessibilityElementsHidden` is the iOS
 * half, `importantForAccessibility` the Android half.
 */
function DrawerScreenContent({ profile }: { profile: AccessProfile }): React.ReactElement {
  const isOpen = useDrawerStatus() === 'open';
  return (
    <View
      style={styles.flex}
      accessibilityElementsHidden={isOpen}
      importantForAccessibility={isOpen ? 'no-hide-descendants' : 'auto'}>
      <RoleTabs profile={profile} />
    </View>
  );
}

/**
 * Wraps the tabs so the menu can be opened from the header avatar on any tab
 * root. Swipe-to-open is off: a left-edge swipe is how you go back inside a
 * stack, and the two gestures fight.
 */
export function AccountDrawer({ profile }: { profile: AccessProfile }): React.ReactElement {
  const renderContent = useCallback(
    (props: DrawerContentComponentProps) => (
      <AccountDrawerContent {...props} profile={profile} />
    ),
    [profile],
  );
  const renderTabs = useCallback(() => <DrawerScreenContent profile={profile} />, [profile]);

  return (
    <Drawer.Navigator
      drawerContent={renderContent}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: false,
      }}>
      <Drawer.Screen name={TABS_ROUTE}>{renderTabs}</Drawer.Screen>
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  /** Defeats the safe-area inset the scroll view applies: the brand block above
      it already paid the top inset, and paying it twice leaves a gap. */
  scroll: { paddingTop: 0 },
  avatar: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center' },
  footer: { borderTopWidth: 1 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dot: { width: layout.dotSize, height: layout.dotSize },
});
