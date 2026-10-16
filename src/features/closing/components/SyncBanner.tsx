import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { formatDisplayTime } from '@/shared/utils';

export interface SyncBannerProps {
  updatedAt: string | null;
  unsyncedCount: number;
  isDayStillOpen: boolean;
}

/**
 * "Updated HH:MM · Pull to refresh", plus the amber unsynced-entries notice
 * and the "day still open" note — never figures into the totals above it,
 * only explains them (CLAUDE.md's "never silently mix local/unsynced data
 * into a server figure" rule).
 */
export function SyncBanner({ updatedAt, unsyncedCount, isDayStillOpen }: SyncBannerProps) {
  const theme = useAppTheme();

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>
        {updatedAt ? `Updated ${formatDisplayTime(updatedAt)}` : 'Updated just now'} · Pull to refresh
      </Text>

      {unsyncedCount > 0 ? (
        <View style={[styles.banner, { backgroundColor: `${theme.colors.warning}17`, borderColor: `${theme.colors.warning}48` }]}>
          <Icon name="warning" size={15} color={theme.colors.warning} />
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>
            {unsyncedCount} local {unsyncedCount === 1 ? 'entry' : 'entries'} not yet synced. This closing doesn't include{' '}
            {unsyncedCount === 1 ? 'it' : 'them'} yet.
          </Text>
        </View>
      ) : null}

      {isDayStillOpen ? (
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 6 }]}>
          Day still open. Figures may change.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
});
