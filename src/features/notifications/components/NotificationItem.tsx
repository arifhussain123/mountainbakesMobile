import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { formatRelativeTime } from '@/shared/utils';
import { NOTIFICATION_TYPES } from '../deepLinks';
import type { NotificationWithReadState } from '@/api';

export interface NotificationItemProps {
  notification: NotificationWithReadState;
  onPress: () => void;
  /** Toggles read/unread — reachable both by swipe (the gesture the spec asks for) and by the trailing tap button (screen readers can't swipe, so the button stays as the accessible equivalent). */
  onToggleRead: () => void;
}

export function NotificationItem({ notification, onPress, onToggleRead }: NotificationItemProps) {
  const theme = useAppTheme();
  const config = NOTIFICATION_TYPES[notification.type];
  const swipeableRef = useRef<SwipeableMethods>(null);

  const accessibilityLabel = `${notification.title}. ${notification.message}. ${formatRelativeTime(notification.createdAt)}${notification.read ? '' : ', unread'}`;

  function handleSwipeToggle() {
    onToggleRead();
    swipeableRef.current?.close();
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
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
        style={[styles.row, { backgroundColor: notification.read ? 'transparent' : `${theme.colors.primary}0D` }]}>
        <View style={[styles.iconBadge, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
          <Icon name={config.icon} size={18} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>
              {notification.title}
            </Text>
            {!notification.read ? <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} /> : null}
          </View>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>{formatRelativeTime(notification.createdAt)}</Text>
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
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 16, minHeight: 44 },
  iconBadge: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  toggleButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  swipeAction: { width: 72, alignItems: 'center', justifyContent: 'center' },
});
