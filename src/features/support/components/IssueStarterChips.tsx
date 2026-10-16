import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';

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
          style={[styles.chip, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.pill }]}>
          <Text style={[theme.typography.label, { color: theme.colors.text }]}>{starter.replace(' — ', '')}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chip: { height: 32, paddingHorizontal: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
