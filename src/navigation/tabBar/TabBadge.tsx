import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface TabBadgeProps {
  count?: number;
  /** A small white dot on the bubble instead of a number — the bubble is already orange, so an orange pill would disappear into it. */
  dot?: boolean;
}

export function TabBadge({ count, dot }: TabBadgeProps) {
  const theme = useAppTheme();
  if (dot) return <View style={[styles.dot, { backgroundColor: theme.colors.background }]} />;
  if (!count || count <= 0) return null;

  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface }]}>
      <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontSize: 9, fontWeight: '700' }]}>
        {count > 9 ? '9+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: -2,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dot: {
    position: 'absolute',
    top: 2,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
