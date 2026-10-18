import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

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

/** branchApp.md screen 05 — the three quick-action pills under the title: Return Items / Discount / Cash Deposit. */
export function QuickActionRow({ onPressReturnItems, onPressDiscount, onPressCashDeposit }: QuickActionRowProps) {
  const theme = useAppTheme();

  const actions: QuickAction[] = [
    { key: 'return', label: 'Return Items', icon: 'rotate-ccw', onPress: onPressReturnItems },
    { key: 'discount', label: 'Discount', icon: 'percent', onPress: onPressDiscount },
    { key: 'cash', label: 'Cash Deposit', icon: 'wallet', onPress: onPressCashDeposit },
  ];

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.pill,
            {
              borderColor: theme.colors.border,
              backgroundColor: pressed ? theme.colors.border : theme.colors.cardFill,
              borderRadius: theme.radii.md,
            },
          ]}>
          <Icon name={action.icon} size={14} color={theme.colors.primary} />
          <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  pill: { flex: 1, height: 38, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
