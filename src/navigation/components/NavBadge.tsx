import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface NavBadgeProps {
  count: number;
  /** A small dot instead of a number — red for failed sync entries, amber for a state to look at. */
  dot?: boolean;
  dotTone?: 'danger' | 'warning';
  /** `muted`: a grey pill for a count that informs rather than asks for action. `onAccent`: inverted, for a row already filled with the accent. */
  tone?: 'accent' | 'muted' | 'onAccent';
}

/** Small pill count on a drawer/tab item — orange for action needed, hidden at 0. */
export function NavBadge({ count, dot, dotTone = 'danger', tone = 'accent' }: NavBadgeProps) {
  const theme = useAppTheme();
  if (!dot && count <= 0) return null;

  if (dot) {
    return <View style={[styles.dot, { backgroundColor: theme.colors[dotTone] }]} accessibilityElementsHidden />;
  }

  const [background, text] =
    tone === 'muted'
      ? [theme.colors.border, theme.colors.textMuted]
      : tone === 'onAccent'
        ? [theme.colors.primaryText, theme.colors.primary]
        : [theme.colors.primary, theme.colors.primaryText];
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[theme.typography.label, { color: text, fontWeight: '700', fontSize: 11 }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
