import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
}

/** A compact stat tile — used inside the Orders card, Stock Overview, etc. */
export function StatCard({ label, value, valueColor }: StatCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[theme.typography.cardTitle, { color: valueColor ?? theme.colors.text, marginTop: 2 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0 },
});
