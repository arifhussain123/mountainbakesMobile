import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';

import { MBBadge, MBIcon, MBLogo, MBPressable } from '@/common/ui';
import { roleLabel } from '@/common/constants/roleLabels';
import { useSignOut } from '@/common/hooks/useSignOut';
import { useAuthStore } from '@/state/authStore';
import { useNetworkStore } from '@/state/networkStore';
import { useSyncStore } from '@/state/syncStore';
import { iconStroke } from '@/common/theme/iconSizes';
import { layout, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import { RoleTabs } from '../RoleTabs';
import {
  drawerItemKey,
  drawerSectionsFor,
  NAV_LABELS,
  type AccessProfile,
  type BadgeSource,
  type DrawerDestination,
} from '../roleConfig';

const Drawer = createDrawerNavigator();

/**
 * The navigation drawer — v6's screen 04.
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
 * What v6 changed, and the one thing it asks for that this does not draw
 * ---------------------------------------------------------------------------
 * **The account state moved into the plum header.** v5 split it: the mark and
 * the branch at the top, the role and the connection dot in the footer beside
 * Logout. v6 puts logo, role, branch and presence together in one `secondary`
 * block and pins only Logout — which is the better arrangement of the same
 * material, because the split had the drawer answering "who am I signed in as"
 * in two places at opposite ends of a scrolling list.
 *
 * `ACCOUNT_PANEL` is unaffected by the move and its invariant is intact: none
 * of identity, branch, connection, appearance or sign-out is a tab, a More row
 * or a drawer row, and sign-out still cannot scroll under a thumb. What the
 * inventory asserts is that the panel holds no *destinations* — not which end
 * of the panel each entry sits at.
 *
 * **The rows keep their section headings.** v6 draws eleven destinations as one
 * hairline-separated list with no groups. Eleven is one role's count; the admin
 * carries roughly twice that, and `drawerSectionsFor` returns titled sections
 * precisely because the More index it derives from is grouped. Flattening would
 * throw that grouping away at the render and leave `navigationSurface.test.ts`
 * asserting headings nothing shows. So the hairlines are adopted and the
 * headings stay.
 *
 * **Appearance is still in Settings.** It was a control sitting in a list of
 * destinations, and neither v5's drawer nor v6's has controls in it.
 *
 * **Identity shows role and branch, not the e-mail address.** §7 rules out
 * e-mail, phone, token and ID, and the JWT carries no display name — so there is
 * nothing else to show without a new API call. v6 draws a person's name in the
 * header; the app draws the role, because that is what it actually knows.
 *
 * **Sign-out is here, only here**, and it still goes through `useSignOut()`,
 * which reads the real unsynced count out of the queue and confirms before
 * dropping the session. That duplication was real and shipped once: two
 * sign-out paths, and this one had no confirm at all.
 */

/** How the drawer navigates: into the tab navigator it wraps. */
const TABS_ROUTE = 'Tabs';

/**
 * The two route names the active-row walk has to recognise by string.
 *
 * `MORE_TAB` is the one tab whose rows are screens inside its stack rather than
 * the tab itself, and `MORE_INDEX` is that stack's root — the More list, which
 * is not a drawer row at all, so sitting on it means nothing is selected.
 */
const MORE_TAB = 'More';
const MORE_INDEX = 'MoreIndex';

/**
 * As much of a navigation state as the active-row walk reads.
 *
 * Declared structurally rather than imported, because the two states this walks
 * through are different types — `NavigationState` once the navigator has
 * rendered, `PartialState` before it has — and the only difference that matters
 * here is that `index` may be missing. React Navigation's own resolution for
 * that is the last route, which is what `current()` does.
 */
type NestedState = {
  index?: number;
  routes: readonly { name: string; state?: NestedState | undefined }[];
};

function current(state: NestedState): NestedState['routes'][number] | undefined {
  return state.routes[state.index ?? state.routes.length - 1];
}

/**
 * Which drawer row is the screen currently on show, as a `drawerItemKey`.
 *
 * The drawer wraps one screen — the tab navigator — so its own state says
 * nothing about where the user is; the answer is two levels down, and three for
 * a More destination. `null` is a real answer rather than a failure: the More
 * index, and any pushed detail screen, are places no drawer row points at.
 */
function activeDrawerKey(state: NestedState): string | null {
  const tabs = current(state)?.state;
  const tab = tabs ? current(tabs) : undefined;
  if (!tab) return null;
  if (tab.name !== MORE_TAB) return tab.name;

  const inner = tab.state ? current(tab.state) : undefined;
  if (!inner || inner.name === MORE_INDEX) return null;
  return drawerItemKey({
    tab: MORE_TAB,
    screen: inner.name,
    // Neither is read by `drawerItemKey`; they are here because it takes a
    // whole destination, and building the string by hand would be the second
    // place a row's identity is spelled out.
    icon: 'more',
    label: 'more',
  });
}

function AccountDrawerContent({
  profile,
  navigation,
  state,
}: DrawerContentComponentProps & { profile: AccessProfile }): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const claims = useAuthStore(s => s.claims);
  const { signOut, isSigningOut } = useSignOut();
  const isOnline = useNetworkStore(s => s.isOnline);

  const sections = useMemo(() => drawerSectionsFor(profile), [profile]);
  const activeKey = activeDrawerKey(state as unknown as NestedState);

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
   *
   * The active row navigates nowhere and only closes. Re-navigating to where
   * you already are resets that tab's stack to its root, so tapping the row for
   * the screen in front of you would silently discard a half-filled form.
   */
  const go = useCallback(
    (item: DrawerDestination) => {
      if (drawerItemKey(item) === activeKey) {
        navigation.closeDrawer();
        return;
      }
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
    [navigation, activeKey],
  );

  const connection = isOnline ? 'Online' : 'Offline';

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.surface }]}>
      {/* The profile header: everything the app knows about who is signed in,
          in one `secondary` block.

          `secondary` and not `secondaryWave`: this is the deep plum the hero
          block is painted with, a flat panel rather than the two crossing
          layers `MBWave` draws at the top of a screen. The wave is a masthead
          over content; the drawer is a surface that slides over the whole
          screen, and a wave inside it would sit under nothing.

          The mark stays on a white disc, which is what lets `MBLogo` keep
          picking by scheme — `logoFor()` names the background it is drawn on,
          and the disc is a light background in both. */}
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
            <Text style={[theme.type.h2, { color: theme.colors.onSecondary }]}>
              {claims ? roleLabel(claims.role) : 'Signed out'}
            </Text>
            {claims?.branchName ? (
              <Text style={[theme.type.caption, { color: theme.colors.onSecondaryMuted }]}>
                {claims.branchName}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Presence, on its own line under the identity rather than beside it —
            a branch name and a connection state are two different facts and
            reading them as one phrase is how "Committee Chowk Offline" happens.
            The dot's colour is redundant with the word next to it, which is
            what keeps it honest for a reader who cannot tell the two apart. */}
        <View
          accessible
          accessibilityLabel={`Connection: ${connection}`}
          style={[styles.row, styles.presence, { gap: theme.space.tight }]}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isOnline
                  ? theme.colors.onSecondarySuccess
                  : theme.colors.onSecondaryOffline,
                borderRadius: theme.radius.pill,
              },
            ]}
          />
          <Text style={[theme.type.caption, { color: theme.colors.onSecondaryMuted }]}>
            {connection}
          </Text>
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
            {section.items.map((item, i) => (
              <DrawerRow
                key={drawerItemKey(item)}
                item={item}
                active={drawerItemKey(item) === activeKey}
                // The last row in a group is followed by the next group's
                // heading, which is its own separation. A rule there reads as
                // an underline on the heading below it.
                divided={i < section.items.length - 1}
                onPress={go}
              />
            ))}
          </View>
        ))}
      </DrawerContentScrollView>

      {/* The one control, pinned below the scroller rather than inside it — a
          sign-out that moves as the menu grows is a sign-out somebody hits by
          accident. It is the only thing left in the footer now that the account
          state has gone to the header, so it takes the full measure. */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.colors.border,
            paddingHorizontal: theme.layout.screenPad,
            paddingTop: theme.space.md,
            paddingBottom: Math.max(insets.bottom, space.md) + space.md,
          },
        ]}>
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
  );
}

/**
 * Memoised, and it has to be: the drawer subscribes to the sync store for its
 * badges, so every drain tick re-renders the content. With a stable item and a
 * stable handler none of the rows re-render with it.
 */
const DrawerRow = React.memo(function DrawerRowView({
  item,
  active,
  divided,
  onPress,
}: {
  item: DrawerDestination;
  active: boolean;
  divided: boolean;
  onPress: (item: DrawerDestination) => void;
}): React.ReactElement {
  const theme = useTheme();
  const badge = useDrawerBadge(item.badge);
  const press = useCallback(() => onPress(item), [onPress, item]);
  const label = NAV_LABELS[item.label];

  /**
   * The selection, in three signals — the same three the tab bar uses, and for
   * the same reason.
   *
   * The ember is the **mark**: a 3dp bar down the left edge, a graphical object
   * held to 3:1 and carrying no type. The glyph and the label take `accent`,
   * because `primary` is 3.04:1 on a card and a 15dp label needs 4.5:1. The
   * third is the tint under the row. Colour alone would also be the one signal
   * a reader with low vision cannot use, which is why the row additionally
   * reports `selected` below.
   */
  const tint = active ? theme.colors.accent : theme.colors.text;

  return (
    <MBPressable
      onPress={press}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      // Without the count folded in, the reader announces a row that is visibly
      // carrying a number as though it were not.
      accessibilityLabel={
        badge
          ? `${label}, ${badge.count} ${badge.tone === 'danger' ? 'need attention' : 'waiting to sync'}`
          : label
      }
      testID={`drawer-${drawerItemKey(item)}`}
      style={[
        styles.row,
        {
          minHeight: theme.layout.tapMin,
          backgroundColor: active ? theme.colors.primarySoft : undefined,
        },
      ]}>
      {/* Reserved on every row and painted on one. See `layout.drawerEdgeW`. */}
      <View
        style={[
          styles.edge,
          {
            width: theme.layout.drawerEdgeW,
            backgroundColor: active ? theme.colors.primary : undefined,
          },
        ]}
      />
      <View
        style={[
          styles.rowBody,
          {
            // The edge is outside this, so the gutter pays 3dp less and the
            // glyphs still line up with the section heading above them.
            paddingLeft: theme.layout.screenPad - theme.layout.drawerEdgeW,
            paddingRight: theme.layout.screenPad,
            gap: theme.space.md,
          },
          divided
            ? {
                borderBottomWidth: StyleSheet.hairlineWidth * 2,
                borderBottomColor: theme.colors.divider,
              }
            : null,
        ]}>
        <MBIcon
          name={item.icon}
          size="drawer"
          color={active ? theme.colors.accent : theme.colors.textMuted}
          strokeWidth={active ? iconStroke.active : iconStroke.regular}
        />
        <Text style={[theme.type.bodyStrong, styles.flex, { color: tint }]}>{label}</Text>
        {badge ? <MBBadge count={badge.count} tone={badge.tone} label="" /> : null}
      </View>
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
  const { width } = useWindowDimensions();

  const renderContent = useCallback(
    (props: DrawerContentComponentProps) => (
      <AccountDrawerContent {...props} profile={profile} />
    ),
    [profile],
  );
  const renderTabs = useCallback(() => <DrawerScreenContent profile={profile} />, [profile]);

  /**
   * The panel is narrower than the screen on purpose — see `layout.drawerPanelMaxW`.
   * Memoised because a fresh options object makes React Navigation re-resolve
   * the navigator's options on every render, and this one changes only on a
   * rotation.
   */
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      drawerType: 'front' as const,
      swipeEnabled: false,
      drawerStyle: {
        width: Math.min(layout.drawerPanelMaxW, Math.round(width * layout.drawerPanelRatio)),
      },
    }),
    [width],
  );

  return (
    <Drawer.Navigator drawerContent={renderContent} screenOptions={screenOptions}>
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
  presence: { paddingTop: space.md },
  /** Stretches to the row's height, whatever `tapMin` and the label make it. */
  edge: { alignSelf: 'stretch' },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  footer: { borderTopWidth: 1 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dot: { width: layout.dotSize, height: layout.dotSize },
});
