import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { MiniStat } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface ChannelBreakdownProps {
  cashAmount: number;
  easypaisaAmount: number;
  bankAmount: number;
  fuelCharges: number;
}

/** "27,900" — the mockup's `mini` figures drop the "Rs." so four fit across a phone. */
const plain = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

/**
 * Redesign `15 Cash Transfers` — Cash / Easypaisa / Bank / Fuel as four `mini`
 * stats on a lavender strip. A Rs. 0 channel is muted so the nonzero ones
 * stand out; Fuel is its own figure in the warning tone, never part of the
 * Total (DB-enforced exclusion, not just a label — see `calculations.ts`).
 */
export function ChannelBreakdown({ cashAmount, easypaisaAmount, bankAmount, fuelCharges }: ChannelBreakdownProps) {
  const theme = useAppTheme();
  const channels: { label: string; value: number; tint?: string }[] = [
    { label: 'Cash', value: cashAmount },
    { label: 'Easypaisa', value: easypaisaAmount },
    { label: 'Bank', value: bankAmount },
    { label: 'Fuel', value: fuelCharges, tint: theme.colors.warning },
  ];

  return (
    <View
      accessible
      accessibilityLabel={channels.map((c) => `${c.label} ${formatCurrency(c.value)}`).join(', ') + (fuelCharges > 0 ? ', fuel booked separately' : '')}
      style={[styles.strip, { backgroundColor: theme.isDark ? theme.colors.border : '#EFEBFF' }]}>
      {channels.map((c) => (
        <MiniStat key={c.label} label={c.label} value={plain(c.value)} valueColor={c.value === 0 ? theme.colors.textFaint : (c.tint ?? theme.colors.text)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 8, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, marginTop: 8 },
});
