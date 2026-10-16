import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '../Icon';
import { PrimaryButton } from '../PrimaryButton';

export interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional glyph above the title — e.g. a module's own icon ('headset' for Help Desk). Omit for the plain text-only empty state most screens already use. */
  icon?: IconName;
}

/** CLAUDE.md Section 40 — message + a useful call to action, never a bare blank. */
export function EmptyState({ title, message, actionLabel, onAction, icon }: EmptyStateProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { paddingVertical: theme.spacing.xxl, paddingHorizontal: theme.spacing.lg }]}>
      {icon ? (
        <View style={{ marginBottom: theme.spacing.md }}>
          <Icon name={icon} size={32} color={theme.colors.textFaint} />
        </View>
      ) : null}
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text, textAlign: 'center' }]}>{title}</Text>
      {message ? (
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.lg, alignSelf: 'stretch' }}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
});
