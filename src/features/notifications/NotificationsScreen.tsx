import { useMemo, useState } from 'react';
import { SectionList, Text, View } from 'react-native';
import { useMarkNotificationsRead, useNotificationsWithReadState } from '@/api';
import { goBack } from '@/navigation';
import { useNetworkStatus } from '@/shared/hooks';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, Icon, LoadingSkeleton, Screen } from '@/shared/ui';
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

  return (
    <Screen>
      <AppHeader
        title="Notifications"
        actions={[
          { icon: 'check', onPress: handleMarkAllRead, accessibilityLabel: 'Mark all as read' },
          { icon: 'close', onPress: goBack, accessibilityLabel: 'Close' },
        ]}
      />

      {isOffline ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            marginHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.sm,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: theme.radii.pill,
            borderWidth: 1,
            backgroundColor: theme.colors.cardFill,
            borderColor: theme.colors.cardBorder,
          }}>
          <Icon name="warning" size={14} color={theme.colors.warning} />
          <Text style={[theme.typography.label, { color: theme.colors.warning, marginLeft: 6 }]}>Offline — showing cached notifications</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        {(['all', 'unread'] as const).map((value) => {
          const active = filter === value;
          return (
            <Text
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(value)}
              style={[
                theme.typography.label,
                {
                  height: 32,
                  paddingHorizontal: 12,
                  lineHeight: 32,
                  borderWidth: 1,
                  borderRadius: theme.radii.pill,
                  fontWeight: '700',
                  overflow: 'hidden',
                  backgroundColor: active ? theme.colors.primary : theme.colors.cardFill,
                  borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                  color: active ? theme.colors.primaryText : theme.colors.text,
                },
              ]}>
              {value === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </Text>
          );
        })}
      </View>

      {isLoading ? <LoadingSkeleton height={100} /> : null}
      {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              theme.typography.label,
              { color: theme.colors.textSecondary, fontWeight: '700', paddingHorizontal: theme.spacing.lg, paddingVertical: 8, backgroundColor: theme.colors.background },
            ]}>
            {section.title.toUpperCase()}
          </Text>
        )}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={() => handlePress(item)} onToggleRead={() => handleToggleRead(item)} />
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
