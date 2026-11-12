import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useMarkNotificationsRead, useNotificationsWithReadState } from '@/api';
import { goBack } from '@/navigation';
import { useNetworkStatus } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FilterChipRow, InfoBanner, LoadingSkeleton, Screen, type FilterChipOption } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { NotificationItem } from './components/NotificationItem';
import { openNotificationRecord } from './deepLinks';
import { groupNotificationsByDay } from './groupNotifications';
import type { NotificationWithReadState } from '@/api';

type Filter = 'all' | 'unread';

/**
 * Step 0: the server caps the feed at 50 (newest first) and has no pagination
 * params — "infinite scroll" has nothing further to load past that, so this
 * renders the capped list as one page rather than faking a second page that
 * would just come back empty.
 */
export function NotificationsScreen() {
  const theme = useAppTheme();
  const { isOffline } = useNetworkStatus();
  const [filter, setFilter] = useState<Filter>('all');
  const { items, unreadCount, isLoading, error, refetch, isRefetching } = useNotificationsWithReadState();
  const markRead = useMarkNotificationsRead();

  const filtered = useMemo(() => (filter === 'unread' ? items.filter((n) => !n.read) : items), [items, filter]);
  const sections = useMemo(
    () => groupNotificationsByDay(filtered).map((g) => ({ title: g.label, data: g.items })),
    [filtered],
  );

  const handlePress = (notification: NotificationWithReadState) => {
    if (!notification.read) markRead.mutate([notification.id]);
    const opened = openNotificationRecord(notification);
    if (!opened) {
      // "Unknown types open a simple detail view" — nothing richer exists to
      // navigate to for these (Finance-only queues, account/security events
      // this app has no screen for), so the title+message already shown in
      // the row stands in as that detail view; there is nothing further to
      // reveal by tapping through.
      goBack();
    }
  };

  const handleToggleRead = (notification: NotificationWithReadState) => {
    if (!notification.read) markRead.mutate([notification.id]);
    // There is no "mark unread" endpoint server-side (Step 0) — this toggle
    // can only ever move a notification from unread to read, same direction
    // a tap-to-open already does. Already-read rows show the button but it's
    // a no-op, which is simpler than hiding it per-row.
  };

  const handleMarkAllRead = () => {
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) markRead.mutate(unreadIds);
  };

  const filterOptions: FilterChipOption<Filter>[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread', count: unreadCount > 0 ? unreadCount : undefined },
  ];

  return (
    <Screen>
      <AppHeader
        title="Notifications"
        actions={[
          { icon: 'check', onPress: handleMarkAllRead, accessibilityLabel: 'Mark all as read' },
          { icon: 'close', onPress: goBack, accessibilityLabel: 'Close' },
        ]}
      />

      <View style={styles.controls}>
        {isOffline ? <InfoBanner kind="warn">Offline — showing cached notifications</InfoBanner> : null}
        <FilterChipRow options={filterOptions} value={filter} onChange={setFilter} />
        {isLoading ? <LoadingSkeleton height={100} /> : null}
        {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.eyebrow, { color: theme.colors.textFaint }]}>{section.title}</Text>
        )}
        renderItem={({ item, index }) => (
          <NotificationItem notification={item} index={index} onPress={() => handlePress(item)} onToggleRead={() => handleToggleRead(item)} />
        )}
        ListEmptyComponent={
          !isLoading && !error ? (
            <EmptyState icon="bell" title="You're all caught up" message="New notifications will show up here." />
          ) : undefined
        }
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 20, gap: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6, paddingTop: 18, paddingBottom: 8 },
});
