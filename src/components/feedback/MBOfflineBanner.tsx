import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/spacing';
import { radius } from '@/theme/radius';

export interface MBOfflineBannerProps {
  /** e.g. "09:14" — when the visible data was last refreshed from the server. */
  dataAsOf?: string;
}

/**
 * Offline indicator — a slim strip **under** the header, not a bar above it.
 *
 * `MBHeader` renders this itself, so no screen has to remember to. It used to
 * sit above the whole navigator, which meant that losing signal pushed the
 * header, the tab bar and every screen down by the height of the strip: the
 * chrome jumped on a connectivity blip, which is a bigger interruption than the
 * message deserves. Below the header only the content moves.
 *
 * Offline is a warning, not an error. Branch staff are offline routinely, so
 * this is `warningBg` and one line — never a red full-width alarm. The copy
 * states that work is kept *and* that it syncs on its own, because the failure
 * this prevents is a staff member assuming a sale was lost and ringing it up a
 * second time.
 *
 * The two sign-in screens do not use it: there, offline genuinely blocks the
 * one thing the screen is for, and each says so beside its disabled button
 * rather than in a strip that reads as routine.
 */
export function MBOfflineBanner({ dataAsOf }: MBOfflineBannerProps): React.ReactElement | null {
  const theme = useTheme();
  const isOnline = useNetworkStore(s => s.isOnline);
  const hasResolved = useNetworkStore(s => s.hasResolved);

  // Don't flash the banner before NetInfo has reported once.
  if (isOnline || !hasResolved) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.warningBg,
          borderBottomColor: theme.colors.offline,
          paddingVertical: theme.space.sm,
          paddingHorizontal: theme.layout.screenPad,
        },
      ]}>
      <View style={[styles.dot, { backgroundColor: theme.colors.offline }]} />
      <View style={styles.text}>
        <Text style={[theme.type.label, { color: theme.colors.text }]}>
          Offline — transactions are saved here and sync automatically
        </Text>
        {dataAsOf ? (
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            Showing data from {dataAsOf}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.snug,
    borderBottomWidth: 1,
  },
  dot: { width: layout.dotSize, height: layout.dotSize, borderRadius: radius.pill },
  text: { flex: 1, gap: space.hair },
});
