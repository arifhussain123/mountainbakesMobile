import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, PrimaryButton, type DropdownOption } from '@/shared/ui';
import type { ExpensePaymentMethod } from '@/api';
import { useNewExpenseForm } from '../../hooks';
import { styles } from './styles';

export interface NewShopExpenseSheetContentProps {
  onClose: () => void;
}

const PAYMENT_OPTIONS: DropdownOption<ExpensePaymentMethod>[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'easypaisa', label: 'Easypaisa' },
];

/** branchApp.md screen 17 — New Shop Expense, presented as a bottom sheet. Today-only date (enforced server-side), cash/easypaisa only. */
export function NewShopExpenseSheetContent({ onClose }: NewShopExpenseSheetContentProps) {
  const theme = useAppTheme();
  const form = useNewExpenseForm();

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Expense Saved', 'The expense has been recorded.', [{ text: 'OK', onPress: onClose }]);
    }
  };

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>CATEGORY</Text>
      <View style={[styles.categoryRow, { marginTop: 8 }]}>
        {form.categories.map((option) => {
          const active = option === form.category;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => form.setCategory(option)}
              style={[
                styles.categoryChip,
                { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border },
              ]}>
              <Text style={[theme.typography.bodySmall, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>AMOUNT</Text>
      <TextInput
        value={form.amountInput}
        onChangeText={form.setAmountInput}
        placeholder="0"
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType="decimal-pad"
        style={[styles.descriptionInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6, fontWeight: '700' }]}
      />

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>EXPENSE DESCRIPTION</Text>
      <TextInput
        value={form.description}
        onChangeText={form.setDescription}
        placeholder="e.g. Electricity bill"
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.descriptionInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
      />

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>PAYMENT METHOD</Text>
      <View style={{ marginTop: 6 }}>
        <Dropdown options={PAYMENT_OPTIONS} value={form.paymentMethod} onChange={form.setPaymentMethod} placeholder="Select a payment method" />
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>REMARKS (OPTIONAL)</Text>
      <TextInput
        value={form.remarks}
        onChangeText={form.setRemarks}
        placeholder="Any notes…"
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        style={[styles.remarksInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
      />

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={{ marginTop: theme.spacing.lg }}>
        <PrimaryButton label="Save Expense" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
      </View>
    </View>
  );
}
