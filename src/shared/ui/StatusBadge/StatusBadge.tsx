import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  variant: StatusVariant;
}

/** One consistent status-pill look, reused everywhere a status appears (CLAUDE.md Section 9). */
export function StatusBadge({ label, variant }: StatusBadgeProps) {
  const theme = useAppTheme();
  const colorByVariant: Record<StatusVariant, string> = {
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    info: theme.colors.primary,
    neutral: theme.colors.textSecondary,
  };
  const color = colorByVariant[variant];

  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A`, borderRadius: theme.radii.pill }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 10, fontWeight: '700' },
});
