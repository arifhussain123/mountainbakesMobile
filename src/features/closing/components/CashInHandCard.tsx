import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils';

export interface CashInHandCardProps {
  cashInHand: number;
  cashSales: number;
  cashExpenses: number;
}

/**
 * The branch's own brief for this rebuild puts Cash in Hand first — it's the
 * number staff physically hand over, so it's what the hero card leads with
 * here (distinct from the original design mock's NET-first hero, which this
 * task's own explicit instructions supersede for this one card).
 */
export function CashInHandCard({ cashInHand, cashSales, cashExpenses }: CashInHandCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg + 6, padding: theme.spacing.lg }]}>
      <Text style={[theme.typography.label, { color: theme.colors.primaryText, textTransform: 'uppercase', letterSpacing: 1.2 }]}>
        CASH IN HAND
      </Text>
      <Text
        accessibilityLabel={`Cash in hand ${cashInHand.toLocaleString()} rupees: cash takings ${cashSales.toLocaleString()} minus cash expenses ${cashExpenses.toLocaleString()}`}
        style={[theme.typography.screenTitle, { color: theme.colors.primaryText, fontSize: 38, marginTop: theme.spacing.sm }]}>
        {formatCurrency(cashInHand)}
      </Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.primaryText, opacity: 0.85, marginTop: 6 }]}>
        Cash takings {formatCurrency(cashSales)} − cash expenses {formatCurrency(cashExpenses)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
});
