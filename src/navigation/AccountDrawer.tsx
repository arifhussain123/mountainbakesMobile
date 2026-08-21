import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';

import { MBButton, MBFilterChips, MBLogo } from '@/components';
import { roleLabel } from '@/constants/roleLabels';
import { useSignOut } from '@/hooks/useSignOut';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { ThemeMode } from '@/theme/themes';
import { layout } from '@/theme/spacing';
import { useTheme, useThemeContext } from '@/theme/ThemeProvider';
import { RoleTabs } from './RoleTabs';
import { NAV_LABELS, type AccessProfile } from './roleConfig';

const Drawer = createDrawerNavigator();

/**
 * The account panel. **Not a navigation surface.**
 *
 * The brief describes bottom tabs *and* a drawer *and* a More tab. That is three
 * routes to the same screen and three menus to keep in sync, so §2 resolves it:
 * tabs own daily operations, More owns everything else, and the drawer stops
 * being a menu. It holds identity, connection state, appearance and sign-out —
 * things that are either read-only or an action, never a destination.
 *
 * That is why there is not a single `navigate()` in this file. If a row here
 * ever needs to push a screen, that screen belongs in More instead.
 *
 * What this panel owns is declared as `ACCOUNT_PANEL` in `roleConfig.ts`, beside
 * the tabs and the More list, and `navigationSurface.test.ts` asserts that none
 * of it is also a tab or a More row. The inventory is checked, not trusted.
 *
 * ---------------------------------------------------------------------------
 * Two contradictions in the brief, resolved
 * ---------------------------------------------------------------------------
 * §2 puts Sync Center and Help in this panel; §4 puts them in More. They cannot
 * be in both — that is the exact duplication non-negotiable #1 forbids. They are
 * in **More**, because §4 enumerates them there alongside Settings and because
 * More is the general secondary surface. This panel keeps only non-destinations.
 *
 * §2 and §4 both claim sign-out. It is **here, only here**. That duplication was
 * real and shipped: two sign-out paths with two separately-written confirms, and
 * the one in this panel had no confirm at all — it dropped the session without
 * ever mentioning unsynced work. See `docs/navigation.md`.
 *
 * Identity shows role and branch. It does **not** show the e-mail address: §7
 * rules out e-mail, phone, token and ID, and the JWT carries no display name
 * (`SessionClaims` is userId / email / role / branchId / branchName), so there
 * is nothing else to show without a new API call.
 */

const MODE_OPTIONS: readonly { key: ThemeMode; label: string; accessibilityLabel: string }[] = [
  { key: 'light', label: 'Light', accessibilityLabel: 'Light theme' },
  { key: 'dark', label: 'Dark', accessibilityLabel: 'Dark theme' },
  { key: 'system', label: 'System', accessibilityLabel: 'Follow the device theme' },
];

function AccountPanel(_props: DrawerContentComponentProps): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { mode } = useThemeContext();
  const claims = useAuthStore(s => s.claims);
  const { signOut, isSigningOut } = useSignOut();
  const isOnline = useNetworkStore(s => s.isOnline);
  const setThemeMode = useSettingsStore(s => s.setThemeMode);

  /**
   * The one sign-out in the app.
   *
   * `useSignOut()` reads the real unsynced count out of the queue table and
   * confirms before dropping the session; this panel deliberately does not write
   * its own confirm. It had one path and More had another, and only More's
   * warned about unsynced work — a sign-out from here silently stranded whatever
   * the queue was still holding. One hook, one behaviour.
   *
   * Sign-out unmounts this whole tree, so there is no component left to show an
   * error in: a failure is logged and the local session is dropped either way.
   */
  const onSignOut = useCallback(() => {
    signOut().catch((err: unknown) => {
      console.warn('[auth] sign-out failed', err);
    });
  }, [signOut]);

  const connection = isOnline ? 'Online' : 'Offline';

  return (
    /* `paddingTop: 0` overrides the safe-area inset DrawerContentScrollView
       applies for us. The identity block is full-bleed brown and has to run
       under the status bar — with the inset left in place there would be a
       cream strip above it. The block pays the inset back itself, below. */
    <DrawerContentScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: theme.space.xxl, gap: theme.space.xxl },
      ]}>
      {/* Identity.

          v4 draws this as a deep-brown block bled to all three edges rather
          than as a card on the field: it is the only thing in the panel that is
          neither a control nor a destination, and giving it the chrome colour
          is what separates "who you are" from "what you can change" without
          needing a divider. The mark says which app; the block below it says
          who is signed in.

          `secondary`, not `primary`. The block is chrome that has to outrank
          everything under it, which is the ink's job in v4 — the ember is a
          fill for things you press, and a whole panel header painted with it
          reads as one enormous button. */}
      <View
        style={[
          {
            backgroundColor: theme.colors.secondary,
            paddingTop: insets.top + theme.space.lg,
            paddingBottom: theme.space.xl,
            paddingHorizontal: theme.layout.screenPad,
            gap: theme.space.md,
          },
        ]}>
        <View style={[styles.row, { gap: theme.space.md }]}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill },
            ]}>
            <MBLogo size={44} />
          </View>

          <View style={[styles.flex, { gap: theme.space.hair }]}>
            <Text style={[theme.type.h2, { color: theme.colors.onSecondary }]}>
              {claims ? roleLabel(claims.role) : 'Signed out'}
            </Text>
            {claims?.branchName ? (
              <Text style={[theme.type.body, { color: theme.colors.onSecondaryMuted }]}>
                {claims.branchName}
              </Text>
            ) : null}

            <View
              accessible
              accessibilityLabel={`Connection: ${connection}`}
              style={[styles.row, styles.connection, { gap: theme.space.tight }]}>
              <View
                style={[
                  styles.dot,
                  {
                    /* On the brown block the status hues stop being legible —
                       `success` is 1.5:1 there. The dot keeps its meaning from
                       the word beside it, and takes a tint that can actually be
                       seen against the chrome. */
                    backgroundColor: isOnline
                      ? theme.colors.successBg
                      : theme.colors.warningBg,
                    borderRadius: theme.radius.pill,
                  },
                ]}
              />
              <Text style={[theme.type.caption, { color: theme.colors.onSecondaryMuted }]}>
                {connection}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Appearance — a control, not a destination. */}
      <View style={{ gap: theme.space.sm, paddingHorizontal: theme.layout.screenPad }}>
        <Text accessibilityRole="header" style={[theme.type.label, { color: theme.colors.textMuted }]}>
          Appearance
        </Text>
        {/* The fifth copy of the chip row, now the shared one. It used to draw
            itself as a pill, which v4 reserves for status — and a theme you are
            choosing between is not a state being reported. */}
        <MBFilterChips
          options={MODE_OPTIONS}
          selectedKey={mode}
          onSelect={key => setThemeMode(key as ThemeMode)}
          testIDPrefix="theme-mode"
        />
      </View>

      <View style={{ paddingHorizontal: theme.layout.screenPad }}>
        <MBButton
          label={NAV_LABELS.logout}
          variant="dangerSoft"
          onPress={onSignOut}
          disabled={isSigningOut}
          fullWidth
        />
      </View>
    </DrawerContentScrollView>
  );
}

/**
 * The tabs, hidden from the accessibility tree while the panel is open.
 *
 * Without this, the panel is drawn over the tabs but the tabs are still what a
 * screen reader walks: TalkBack reads the More list underneath and never reaches
 * the appearance controls or Sign out, so the panel is unusable without sight.
 * It is a visual overlay, not an accessibility one, until it is told otherwise.
 *
 * Both props are needed — `accessibilityElementsHidden` is the iOS half,
 * `importantForAccessibility` the Android half.
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
 * Wraps the tabs so the panel can be opened from the header avatar on any tab
 * root. Swipe-to-open is off: a left-edge swipe is how you go back inside a
 * stack, and the two gestures fight.
 */
export function AccountDrawer({ profile }: { profile: AccessProfile }): React.ReactElement {
  const renderContent = useCallback(
    (props: DrawerContentComponentProps) => <AccountPanel {...props} />,
    [],
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
      <Drawer.Screen name="Tabs">{renderTabs}</Drawer.Screen>
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  /** See the comment at the render site — this defeats the inset the scroll
      view applies, so the identity block can run under the status bar. */
  scroll: { paddingTop: 0 },
  avatar: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  connection: { marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: layout.dotSize, height: layout.dotSize },
});
