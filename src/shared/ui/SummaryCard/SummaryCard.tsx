import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface SummaryCardProps {
  label: string;
  value: string;
  subLabel?: string;
  emphasis?: boolean;
}

/** One card in the Dashboard's horizontally-scrolling Sales/Expenses/Net/Orders/Discounts row. */
export function SummaryCard({ label, value, subLabel, emphasis }: SummaryCardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        theme.cardShadow,
        {
          backgroundColor: emphasis ? theme.colors.primary : theme.colors.surface,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.lg,
          borderColor: theme.colors.border,
          borderWidth: emphasis ? 0 : 1,
        },
      ]}>
      <Text
        style={[
          theme.typography.label,
          { color: emphasis ? theme.colors.primaryText : theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
        ]}>
        {label}
      </Text>
      <Text style={[theme.typography.kpi, { color: emphasis ? theme.colors.primaryText : theme.colors.text, marginTop: 6 }]}>{value}</Text>
      {subLabel ? (
        <Text style={[theme.typography.bodySmall, { color: emphasis ? theme.colors.primaryText : theme.colors.textSecondary, marginTop: 4, opacity: emphasis ? 0.85 : 1 }]}>
          {subLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 150,
  },
});
