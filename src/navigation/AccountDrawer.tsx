import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';

import { MBButton, MBIcon } from '@/components';
import { roleLabel } from '@/constants/roleLabels';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { ThemeMode } from '@/theme/theme';
import { useTheme, useThemeContext } from '@/theme/ThemeProvider';
import { RoleTabs } from './RoleTabs';
import type { AccessProfile } from './roleConfig';

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
 * ---------------------------------------------------------------------------
 * One contradiction in the brief, resolved
 * ---------------------------------------------------------------------------
 * §2 puts Sync Center and Help in this panel; §4 puts them in More. They cannot
 * be in both — that is the exact duplication non-negotiable #1 forbids. They are
 * in **More**, because §4 enumerates them there alongside Settings and because
 * More is the general secondary surface. This panel keeps only non-destinations.
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
  const signOut = useAuthStore(s => s.signOut);
  const isOnline = useNetworkStore(s => s.isOnline);
  const setThemeMode = useSettingsStore(s => s.setThemeMode);

  const onSignOut = useCallback(() => {
    // Sign-out clears auth state, which unmounts this whole tree — there is no
    // component left to show an error in, so a failure is logged and nothing
    // more. The local session is dropped either way.
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
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel="Mountain Bakes"
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
              <Pressable
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
              </Pressable>
            );
          })}
        </View>
      </View>

      <MBButton label="Sign out" variant="secondary" onPress={onSignOut} />
    </DrawerContentScrollView>
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
  const renderTabs = useCallback(() => <RoleTabs profile={profile} />, [profile]);

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
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8 },
  chip: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
