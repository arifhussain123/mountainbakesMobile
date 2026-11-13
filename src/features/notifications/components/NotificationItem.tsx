import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useAppTheme } from '@/shared/theme';
import { Icon, ListThumb } from '@/shared/ui';
import { formatRelativeTime } from '@/shared/utils';
import { notificationTypeConfig } from '../deepLinks';
import type { NotificationWithReadState } from '@/api';

export interface NotificationItemProps {
  notification: NotificationWithReadState;
  onPress: () => void;
  /** Toggles read/unread — reachable both by swipe (the gesture the spec asks for) and by the trailing tap button (screen readers can't swipe, so the button stays as the accessible equivalent). */
  onToggleRead: () => void;
  /** Row index within its day — picks the thumb's pastel so consecutive rows alternate. */
  index?: number;
}

export function NotificationItem({ notification, onPress, onToggleRead, index = 0 }: NotificationItemProps) {
  const theme = useAppTheme();
  const config = notificationTypeConfig(notification.type);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const accessibilityLabel = `${notification.title}. ${notification.message}. ${formatRelativeTime(notification.createdAt)}${notification.read ? '' : ', unread'}`;

  function handleSwipeToggle() {
    onToggleRead();
    swipeableRef.current?.close();
  }

  // 2026 redesign: each notification is a white card with a pastel thumb; unread ones get a lavender wash.
  const unreadFill = theme.isDark ? `${theme.colors.primary}14` : '#F3F0FF';

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.container}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={notification.read ? 'Mark as unread' : 'Mark as read'}
          onPress={handleSwipeToggle}
          style={[styles.swipeAction, { backgroundColor: theme.colors.primary }]}>
          <Icon name={notification.read ? 'bell' : 'check'} size={20} color={theme.colors.primaryText} />
        </Pressable>
      )}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={[
          styles.row,
          {
            backgroundColor: notification.read ? theme.colors.cardFill : unreadFill,
            borderColor: notification.read ? theme.colors.cardBorder : theme.isDark ? theme.colors.cardBorder : '#E2DBFF',
          },
        ]}>
        <ListThumb icon={config.icon} index={index} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
              {notification.title}
            </Text>
            {!notification.read ? <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} /> : null}
          </View>
          <Text style={[styles.sm, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{formatRelativeTime(notification.createdAt)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={notification.read ? 'Mark as unread' : 'Mark as read'}
          hitSlop={8}
          onPress={onToggleRead}
          style={styles.toggleButton}>
          <Icon name={notification.read ? 'bell' : 'check'} size={16} color={theme.colors.textFaint} />
        </Pressable>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10, borderRadius: 22 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, minHeight: 44, borderRadius: 22, borderWidth: 1 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  sm: { fontSize: 13, lineHeight: 18 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  toggleButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  swipeAction: { width: 72, marginLeft: 8, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
