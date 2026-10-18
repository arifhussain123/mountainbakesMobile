import { useNotificationsWithReadState } from '@/api';
import { openNotifications } from '@/navigation/helpers';
import type { AppHeaderAction } from '@/shared/ui';

/** Builds the bell `AppHeaderAction` every module header's `AppHeader` can drop into its `actions` array — badge count from the feed's own derived unread count (see `useNotificationsWithReadState`), capped at "9+" by `AppHeader` itself. */
export function useNotificationBellAction(): AppHeaderAction {
  const { unreadCount } = useNotificationsWithReadState();

  return {
    icon: 'bell',
    onPress: openNotifications,
    badgeCount: unreadCount,
    accessibilityLabel: unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications',
  };
}
