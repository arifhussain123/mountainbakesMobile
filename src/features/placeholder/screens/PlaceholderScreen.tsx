import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MBAccountButton, MBButton, MBCard, MBHeader } from '@/common/ui';
import { useSignOut } from '@/common/hooks/useSignOut';
import { useAuthStore } from '@/state/authStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { contentColumn, space } from '@/common/theme/spacing';

/**
 * Temporary screen body used by the Phase 2 navigation shell.
 *
 * It states plainly that the screen is not built yet rather than showing an
 * empty list that could be mistaken for "no data" — an empty Sales screen and an
 * unbuilt Sales screen must not look the same to anyone testing this build.
 *
 * Every one of these is replaced by a real screen in Phases 3–8.
 */
export function PlaceholderScreen({
  title,
  phase,
  endpoint,
  action,
}: {
  title: string;
  phase: string;
  endpoint?: string;
  /**
   * A working action this unbuilt screen can still offer.
   *
   * This exists for one real case. The branch order **list** is not built, but
   * the branch order **form** is — and when New Order stopped being a tab and
   * became a modal on OrdersStack, the form lost its only entry point: the list
   * that would have launched it does not exist yet. Rather than leave a built
   * screen unreachable, the placeholder carries the action until the list lands,
   * at which point this prop goes away with it.
   */
  action?: { label: string; onPress: () => void };
}): React.ReactElement {
  const theme = useTheme();
  const claims = useAuthStore(s => s.claims);
  const { signOut, isSigningOut } = useSignOut();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        leading={<MBAccountButton />}
        title={title}
        subtitle={claims?.branchName ?? undefined}
      />
      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}>
        <MBCard>
          <View style={styles.body}>
            <Text style={[theme.type.h3, { color: theme.colors.text }]}>Not built yet</Text>
            <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>
              {title} arrives in {phase}. The navigation shell, theme, API client and local database
              are in place; this screen has no UI yet.
            </Text>
            {endpoint ? (
              <Text style={[theme.type.mono, { color: theme.colors.textMuted }]}>{endpoint}</Text>
            ) : null}
            {action ? <MBButton label={action.label} onPress={action.onPress} size="md" /> : null}
          </View>
        </MBCard>

        <MBCard>
          <View style={styles.body}>
            <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Signed in as</Text>
            <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
              {claims?.email ?? '—'}
            </Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {claims?.role ?? '—'}
            </Text>
          </View>
        </MBCard>

        {/* Lives here until the More/Profile screen exists, so the shell is
            usable end-to-end. It warns first if unsynced work is on the device. */}
        <MBButton
          label="Sign out"
          onPress={signOut}
          loading={isSigningOut}
          variant="secondary"
          size="md"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: space.sm },
});
