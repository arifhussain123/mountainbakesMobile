import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface SyncBadgeProps {
  pendingCount: number;
  failedCount: number;
}

/**
 * Shown in a header when the offline write queue (`@/state`'s
 * `useOfflineQueueStore`) has anything queued or stuck — prop-driven rather
 * than reading the store itself, same pattern as every other `shared/ui`
 * component (none of them import `@/state`). Renders nothing when both
 * counts are zero.
 */
export function SyncBadge({ pendingCount, failedCount }: SyncBadgeProps) {
  const theme = useAppTheme();
  if (pendingCount === 0 && failedCount === 0) return null;

  const isFailed = failedCount > 0;
  const color = isFailed ? theme.colors.danger : theme.colors.warning;
  const label = isFailed
    ? `${failedCount} failed to sync`
    : `${pendingCount} waiting to sync`;

  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A`, borderRadius: theme.radii.pill }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 10, fontWeight: '700' },
});
