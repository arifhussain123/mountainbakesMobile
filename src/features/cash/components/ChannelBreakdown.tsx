import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils';

export interface ChannelBreakdownProps {
  cashAmount: number;
  easypaisaAmount: number;
  bankAmount: number;
  fuelCharges: number;
}

/**
 * Cash/Easypaisa/Bank, each muted when Rs. 0 so nonzero channels stand out,
 * plus Fuel in its own muted pill off to the side so it reads as clearly NOT
 * part of the Total (DB-enforced exclusion, not just a label — see
 * `calculations.ts`).
 */
export function ChannelBreakdown({ cashAmount, easypaisaAmount, bankAmount, fuelCharges }: ChannelBreakdownProps) {
  const theme = useAppTheme();
  const channels: { label: string; value: number }[] = [
    { label: 'Cash', value: cashAmount },
    { label: 'Easypaisa', value: easypaisaAmount },
    { label: 'Bank', value: bankAmount },
  ];

  return (
    <View style={styles.row}>
      {channels.map((c) => (
        <Text key={c.label} style={[theme.typography.label, { color: c.value === 0 ? theme.colors.textFaint : theme.colors.text }]}>
          {c.label} <Text style={{ fontWeight: '700' }}>{formatCurrency(c.value)}</Text>
        </Text>
      ))}
      {fuelCharges > 0 ? (
        <View style={[styles.fuelPill, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
          <Text style={[theme.typography.label, { color: theme.colors.warning, fontWeight: '700' }]}>Fuel {formatCurrency(fuelCharges)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 8 },
  fuelPill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
});
