import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';

import { MBButton, MBIcon, MBLogo, MBPressable } from '@/components';
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

const MODES: readonly { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function AccountPanel(_props: DrawerContentComponentProps): React.ReactElement {
  const theme = useTheme();
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
    <DrawerContentScrollView
      contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.xxl }}>
      {/* Identity */}
      <View style={{ gap: theme.space.md }}>
        {/* The mark says which app; the avatar below says who is signed in.
            Neither is announced — the role and branch beneath them are the
            answer a screen reader user is after. */}
        <MBLogo />

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.primary, borderRadius: theme.radius.pill },
          ]}>
          <MBIcon name="profile" size="header" color={theme.colors.onPrimary} />
        </View>

        <View style={{ gap: theme.space.xs }}>
          <Text style={[theme.type.h2, { color: theme.colors.text }]}>
            {claims ? roleLabel(claims.role) : 'Signed out'}
          </Text>
          {claims?.branchName ? (
            <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
              {claims.branchName}
            </Text>
          ) : null}

          <View
            accessible
            accessibilityLabel={`Connection: ${connection}`}
            style={[styles.row, { gap: theme.space.sm }]}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: isOnline ? theme.colors.success : theme.colors.offline,
                  borderRadius: theme.radius.pill,
                },
              ]}
            />
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{connection}</Text>
          </View>
        </View>
      </View>

      {/* Appearance — a control, not a destination. */}
      <View style={{ gap: theme.space.sm }}>
        <Text accessibilityRole="header" style={[theme.type.label, { color: theme.colors.textMuted }]}>
          Appearance
        </Text>
        <View style={[styles.row, { gap: theme.space.sm }]}>
          {MODES.map(m => {
            const selected = mode === m.value;
            return (
              <MBPressable
                key={m.value}
                onPress={() => setThemeMode(m.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${m.label} theme`}
                style={[
                  styles.chip,
                  {
                    minHeight: theme.layout.tapMin,
                    paddingHorizontal: theme.space.md,
                    borderRadius: theme.radius.pill,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.caption,
                    { color: selected ? theme.colors.onPrimary : theme.colors.text },
                  ]}>
                  {m.label}
                </Text>
              </MBPressable>
            );
          })}
        </View>
      </View>

      <MBButton
        label={NAV_LABELS.logout}
        variant="secondary"
        onPress={onSignOut}
        disabled={isSigningOut}
      />
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
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: layout.dotSize, height: layout.dotSize },
  chip: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
