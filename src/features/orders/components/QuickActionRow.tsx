import { StyleSheet, View } from 'react-native';
import type { IconName } from '@/shared/ui';
import { SmallButton } from '@/shared/ui';

export interface QuickActionRowProps {
  onPressReturnItems: () => void;
  onPressDiscount: () => void;
  onPressCashDeposit: () => void;
}

interface QuickAction {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
}

/** The three quick actions at the top of Create Order: Return Items / Discount / Cash Deposit — redesign `btn(…, 'secondary', icon, 'sm')`. */
export function QuickActionRow({ onPressReturnItems, onPressDiscount, onPressCashDeposit }: QuickActionRowProps) {
  const actions: QuickAction[] = [
    { key: 'return', label: 'Return Items', icon: 'rotate-ccw', onPress: onPressReturnItems },
    { key: 'discount', label: 'Discount', icon: 'percent', onPress: onPressDiscount },
    { key: 'cash', label: 'Cash Deposit', icon: 'wallet', onPress: onPressCashDeposit },
  ];

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <SmallButton key={action.key} label={action.label} icon={action.icon} size="sm" onPress={action.onPress} style={styles.item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  item: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
});
