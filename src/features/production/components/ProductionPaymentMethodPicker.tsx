import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import type { ProductionSalePaymentMethod } from '@/api';

export interface ProductionPaymentMethodPickerProps {
  value: ProductionSalePaymentMethod;
  onChange: (method: ProductionSalePaymentMethod) => void;
}

const OPTIONS: { value: ProductionSalePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'foodpanda', label: 'Foodpanda' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'staff', label: 'Staff (No Charge)' },
];

/** Adds 'staff' to the Branch app's own PaymentMethodPicker options — Production-only. */
export function ProductionPaymentMethodPicker({ value, onChange }: ProductionPaymentMethodPickerProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                borderColor: active ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.radii.sm,
              },
            ]}>
            <Text style={[theme.typography.bodySmall, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, flexGrow: 1, minWidth: '47%', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
