import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

export interface IssueStarterChipsProps {
  onPick: (starter: string) => void;
}

/** Each inserts a starter phrase the user then completes — never submitted as-is, which is why every phrase ends with "—" rather than a full stop. */
const STARTERS = ['Wrong amount — ', 'Wrong payment method — ', 'Duplicate entry — ', 'Wrong date — ', 'Wrong quantity — '];

export function IssueStarterChips({ onPick }: IssueStarterChipsProps) {
  const theme = useAppTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {STARTERS.map((starter) => (
        <Pressable
          key={starter}
          accessibilityRole="button"
          accessibilityLabel={`Insert starter: ${starter.replace(' — ', '')}`}
          onPress={() => onPick(starter)}
          style={[styles.chip, { backgroundColor: theme.colors.cardFill, borderColor: theme.isDark ? theme.colors.cardBorder : '#E6E1FA' }]}>
          <Icon name="plus" size={14} color={theme.colors.textFaint} />
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{starter.replace(' — ', '')}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  // 2026 redesign `.chip`: 36pt white pill, faint lavender border, 13/600 slate text.
  chip: { height: 36, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 13, fontWeight: '600' },
});
