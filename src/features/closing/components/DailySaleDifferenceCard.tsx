import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface DailySaleDifferenceCardProps {
  /** The window's total difference — positive is over, negative is short, 0 is matched. */
  difference: number;
}

/** `Rs. 20 over` / `Rs. 20 short` / `Matched` — the row-card wording, applied to the window total. */
export function formatDifferenceAmount(difference: number): string {
  if (difference === 0) return 'Matched';
  return `${formatCurrency(Math.abs(difference))} ${difference > 0 ? 'over' : 'short'}`;
}

/**
 * Design "21 Daily Sale Record" line 1014 — the red-tinted "Difference" card
 * with a warning-triangle icon, replacing the old equal-weight `StatCard`.
 */
export function DailySaleDifferenceCard({ difference }: DailySaleDifferenceCardProps) {
  const theme = useAppTheme();
  const isMatched = difference === 0;

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: theme.radii.lg,
          backgroundColor: isMatched ? `${theme.colors.success}14` : `${theme.colors.danger}14`,
          borderColor: isMatched ? `${theme.colors.success}4D` : `${theme.colors.danger}4D`,
          padding: theme.spacing.md,
        },
      ]}>
      <View>
        <Text style={[theme.typography.label, { color: isMatched ? theme.colors.success : theme.colors.danger }]}>Difference</Text>
        <Text
          style={[
            theme.typography.cardTitle,
            { fontSize: 18, marginTop: 2, color: isMatched ? theme.colors.success : theme.colors.danger },
          ]}>
          {formatDifferenceAmount(difference)}
        </Text>
      </View>
      <Icon name="warning" size={22} color={isMatched ? theme.colors.success : theme.colors.danger} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
