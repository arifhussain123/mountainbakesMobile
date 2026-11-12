import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { InfoBanner } from '@/shared/ui';
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
    <View style={styles.box}>
      <Text style={[styles.xs, { color: theme.colors.textFaint }]}>
        {updatedAt ? `Updated ${formatDisplayTime(updatedAt)}` : 'Updated just now'} · Pull to refresh
        {isDayStillOpen ? ' · Day still open. Figures may change.' : ''}
      </Text>

      {unsyncedCount > 0 ? (
        <InfoBanner kind="warn">
          {`${unsyncedCount} local ${unsyncedCount === 1 ? 'entry' : 'entries'} not yet synced. This closing doesn't include ${unsyncedCount === 1 ? 'it' : 'them'} yet.`}
        </InfoBanner>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
});
