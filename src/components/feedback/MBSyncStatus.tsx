import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNetworkStore } from '@/store/networkStore';
import { useSyncStore } from '@/store/syncStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Header pill showing sync state, tappable through to the Sync Center.
 *
 * Renders nothing when online, idle and empty — a permanent "all good" badge is
 * noise, and its absence is what makes its presence meaningful.
 */
export function MBSyncStatus(): React.ReactElement | null {
  const theme = useTheme();
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const isOnline = useNetworkStore(s => s.isOnline);
  const phase = useSyncStore(s => s.phase);
  const pending = useSyncStore(s => s.pending);
  const needsAttention = useSyncStore(s => s.needsAttention);

  const syncing = phase === 'syncing';
  const quiet = isOnline && !syncing && pending === 0 && needsAttention === 0;
  if (quiet) return null;

  const { label, color } = describe({ isOnline, syncing, pending, needsAttention, theme });

  return (
    <Pressable
      onPress={() => navigation.navigate('SyncCenter')}
      accessibilityRole="button"
      accessibilityLabel={`${label}. Open Sync Center.`}
      hitSlop={8}
      style={[
        styles.pill,
        { borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceSunken },
      ]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[theme.type.caption, { color: theme.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function describe({
  isOnline,
  syncing,
  pending,
  needsAttention,
  theme,
}: {
  isOnline: boolean;
  syncing: boolean;
  pending: number;
  needsAttention: number;
  theme: ReturnType<typeof useTheme>;
}): { label: string; color: string } {
  if (syncing) return { label: 'Syncing…', color: theme.colors.syncing };
  if (needsAttention > 0) {
    return { label: `${needsAttention} need attention`, color: theme.colors.syncFailed };
  }
  if (!isOnline) {
    return {
      label: pending > 0 ? `${pending} waiting` : 'Offline',
      color: theme.colors.offline,
    };
  }
  return { label: `${pending} waiting`, color: theme.colors.warning };
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
