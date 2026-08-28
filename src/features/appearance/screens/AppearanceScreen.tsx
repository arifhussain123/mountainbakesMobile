import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { MBHeader } from '@/common/ui';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

import { AppearanceCard } from '../components';

/**
 * Settings, for a role that may not edit the business settings.
 *
 * `PUT /api/settings` is super_admin only, so `resolveMoreScreen` used to hand
 * every other role the "not built yet" placeholder for this route. But the two
 * preferences on it — scheme and brand fill — are **device-local** and have
 * nothing to do with that endpoint, and the drawer had already moved Appearance
 * here on the reasoning that "theme and accent are preferences, which is what
 * the Settings row is for".
 *
 * The result was a trap: `MBAccentPicker` was rendered nowhere, so a device
 * holding a non-default accent could not be changed back from inside the app.
 * This screen is what makes that reachable again for the roles that had nothing.
 */
export function AppearanceScreen(): React.ReactElement {
  const theme = useTheme();

  return (
    <>
      <MBHeader title="Settings" />
      <ScrollView
        style={{ backgroundColor: theme.colors.bg }}
        contentContainerStyle={[styles.content, contentColumn]}>
        <AppearanceCard />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: space.md, gap: space.md },
});
