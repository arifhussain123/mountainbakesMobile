import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '@/store/networkStore';
import { useTheme } from '@/theme/ThemeProvider';

export interface MBOfflineBannerProps {
  /** e.g. "09:14" — when the visible data was last refreshed from the server. */
  dataAsOf?: string;
}

/**
 * Offline indicator.
 *
 * Offline is a warning, not an error: the app still works, and work created now
 * is kept. The copy says so explicitly, because the failure mode this prevents
 * is a staff member assuming a sale was lost and ringing it up a second time.
 */
export function MBOfflineBanner({ dataAsOf }: MBOfflineBannerProps): React.ReactElement | null {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
          paddingTop: insets.top + theme.space.sm,
          paddingBottom: theme.space.sm,
          paddingHorizontal: theme.layout.screenPad,
        },
      ]}>
      <View style={[styles.dot, { backgroundColor: theme.colors.offline }]} />
      <View style={styles.text}>
        <Text style={[theme.type.label, { color: theme.colors.text }]}>
          Offline — your work is saved on this device
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, gap: 2 },
});
