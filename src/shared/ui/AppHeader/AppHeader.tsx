import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '../Icon';

export interface AppHeaderAction {
  /** Also doubles as this action's React key — two actions with the same icon in one header aren't supported (none currently need to be). */
  icon: IconName;
  onPress: () => void;
  /** The Appearance quick-toggle (moon/sun): tap cycles Light/Dark, long-press opens the full sheet. */
  onLongPress?: () => void;
  badgeCount?: number;
  accessibilityLabel: string;
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: AppHeaderAction[];
}

/** The "Good Morning / Branch Name [bell] [menu]" header, reused for every top-level screen. */
export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.row, { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }]}>
      <View style={styles.titleBlock}>
        <Text style={[theme.typography.screenTitle, { color: theme.colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {actions && actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.icon}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              onPress={action.onPress}
              onLongPress={action.onLongPress}
              delayLongPress={action.onLongPress ? 350 : undefined}
              style={[styles.actionButton, { backgroundColor: theme.colors.border, borderRadius: theme.radii.pill }]}>
              <Icon name={action.icon} color={theme.colors.text} />
              {action.badgeCount ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.primaryText }]}>
                    {action.badgeCount > 9 ? '9+' : action.badgeCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleBlock: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700' },
});
