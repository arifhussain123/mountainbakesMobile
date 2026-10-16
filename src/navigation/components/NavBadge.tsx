import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface NavBadgeProps {
  count: number;
  /** A small red dot (failed sync entries) instead of a number. */
  dot?: boolean;
}

/** Small pill count on a drawer/tab item — orange for action needed, hidden at 0. */
export function NavBadge({ count, dot }: NavBadgeProps) {
  const theme = useAppTheme();
  if (!dot && count <= 0) return null;

  if (dot) {
    return <View style={[styles.dot, { backgroundColor: theme.colors.danger }]} accessibilityElementsHidden />;
  }

  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.primary }]}>
      <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700', fontSize: 11 }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
