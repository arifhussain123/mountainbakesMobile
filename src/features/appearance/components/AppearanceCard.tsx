import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBAccentPicker, MBCard, MBFilterChips, type FilterChip } from '@/common/ui';
import type { AccentKey } from '@/common/theme/accents';
import { space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import type { ThemeMode } from '@/common/theme/themes';
import { useSettingsStore } from '@/state';

/**
 * Scheme and brand fill — the two device-local preferences.
 *
 * ---------------------------------------------------------------------------
 * Why this is a card and not a screen
 * ---------------------------------------------------------------------------
 * Both roles need it and only one of them may edit business settings. The admin
 * renders this inside `SettingsScreen` above the server-backed form; every other
 * role gets `AppearanceScreen`, which is this card and nothing else. Writing it
 * once is the point: an accent row that existed twice would drift the moment a
 * sixth swatch landed.
 *
 * ---------------------------------------------------------------------------
 * The scheme applies now; the splash follows on the next cold start
 * ---------------------------------------------------------------------------
 * `setThemeMode` mirrors the choice into SharedPreferences for `MainActivity`,
 * which turns it into an `AppCompatDelegate` night mode *before*
 * `RNBootSplash.init`. That mirror is deliberately not applied mid-session —
 * doing so recreates the activity and remounts the React tree under the user.
 * So the JS side re-themes immediately and the native splash catches up next
 * launch, which is what the caption below says rather than leaving someone to
 * wonder why the first frame still flashed the old scheme.
 */

const MODES: readonly FilterChip[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export function AppearanceCard(): React.ReactElement {
  const theme = useTheme();
  const themeMode = useSettingsStore(s => s.themeMode);
  const setThemeMode = useSettingsStore(s => s.setThemeMode);
  const accent = useSettingsStore(s => s.accent);
  const setAccent = useSettingsStore(s => s.setAccent);

  const onMode = useCallback(
    (key: string) => setThemeMode(key as ThemeMode),
    [setThemeMode],
  );
  const onAccent = useCallback((key: AccentKey) => setAccent(key), [setAccent]);

  return (
    <MBCard>
      <View style={styles.block}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Theme</Text>
        <MBFilterChips
          options={MODES}
          selectedKey={themeMode}
          onSelect={onMode}
          testIDPrefix="theme-mode"
        />
        <Text style={[styles.caption, { color: theme.colors.textMuted }]}>
          The startup screen follows on the next launch.
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Theme colour</Text>
        <MBAccentPicker value={accent} onSelect={onAccent} />
      </View>
    </MBCard>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm, paddingVertical: space.sm },
  label: { fontSize: 15, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 18 },
});
