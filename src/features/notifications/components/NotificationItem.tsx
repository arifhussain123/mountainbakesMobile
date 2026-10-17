import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { formatRelativeTime } from '@/shared/utils';
import { NOTIFICATION_TYPES } from '../deepLinks';
import type { NotificationWithReadState } from '@/api';

export interface NotificationItemProps {
  notification: NotificationWithReadState;
  onPress: () => void;
  /** Swipe-to-toggle — a plain button here rather than a gesture gives the same outcome (tap once to flip read state) without a bespoke swipeable-row implementation. */
  onToggleRead: () => void;
}

export function NotificationItem({ notification, onPress, onToggleRead }: NotificationItemProps) {
  const theme = useAppTheme();
  const config = NOTIFICATION_TYPES[notification.type];

  const accessibilityLabel = `${notification.title}. ${notification.message}. ${formatRelativeTime(notification.createdAt)}${notification.read ? '' : ', unread'}`;

  return (
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 16, minHeight: 44 },
  iconBadge: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  toggleButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
});
