import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { getBusinessDate } from '@/api';
import { midnightFill, useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton, SegmentedControl, TextField, type SegmentedOption } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { ExpensePaymentMethod } from '@/api';
import { useNewExpenseForm } from '../../hooks';
import { styles } from './styles';

export interface NewShopExpenseSheetContentProps {
  onClose: () => void;
}

const PAYMENT_OPTIONS: SegmentedOption<ExpensePaymentMethod>[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'easypaisa', label: 'Easypaisa' },
];

/**
 * branchApp.md screen 17 — New Shop Expense, presented as a bottom sheet
 * (redesign B17: date + amount side by side, category chips, description,
 * payment segment, remarks). Today-only date (enforced server-side, so the
 * date is shown read-only), cash/easypaisa only.
 */
export function NewShopExpenseSheetContent({ onClose }: NewShopExpenseSheetContentProps) {
  const theme = useAppTheme();
  const form = useNewExpenseForm();
  const [remarksFocused, setRemarksFocused] = useState(false);
  // The selected chip: a midnight pill on light (as FilterChipRow), the accent on dark.
  const chipOn = midnightFill(theme);
  const chipOnInk = '#FFFFFF';
  const labelStyle = [theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700' as const }];

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Expense Saved', 'The expense has been recorded.', [{ text: 'OK', onPress: onClose }]);
    }
  };

  return (
    <View>
      <View style={styles.grid2}>
        <View style={styles.cell}>
          <TextField
            label="Date"
            value={formatDisplayDate(getBusinessDate())}
            editable={false}
            rightAccessory={
              <View style={styles.accessory}>
                <Icon name="calendar" size={18} color={theme.colors.textFaint} />
              </View>
            }
          />
        </View>
        <View style={styles.cell}>
          <TextField
            label="Amount (Rs.)"
            required
            value={form.amountInput}
            onChangeText={form.setAmountInput}
            placeholder="0"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Text style={[labelStyle, { marginTop: 16 }]}>
        Category<Text style={{ color: theme.colors.danger }}> *</Text>
      </Text>
      <View style={[styles.categoryRow, { marginTop: theme.spacing.sm }]}>
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
                {
                  backgroundColor: active ? chipOn : theme.colors.cardFill,
                  borderColor: active ? chipOn : theme.colors.cardBorder,
                },
              ]}>
              <Text style={[styles.chipLabel, { color: active ? chipOnInk : theme.colors.textSecondary }]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextField label="Description" required value={form.description} onChangeText={form.setDescription} placeholder="e.g. Electricity bill" />

      <Text style={[labelStyle, { marginTop: 16 }]}>Payment method</Text>
      <SegmentedControl options={PAYMENT_OPTIONS} value={form.paymentMethod} onChange={form.setPaymentMethod} style={{ marginTop: theme.spacing.sm }} />

      <Text style={[labelStyle, { marginTop: 16 }]}>Remarks (optional)</Text>
      <TextInput
        value={form.remarks}
        onChangeText={form.setRemarks}
        placeholder="Any notes…"
        placeholderTextColor={theme.colors.textFaint}
        multiline
        onFocus={() => setRemarksFocused(true)}
        onBlur={() => setRemarksFocused(false)}
        style={[
          styles.remarksInput,
          {
            marginTop: theme.spacing.sm,
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.cardFill,
            borderColor: remarksFocused ? theme.colors.primary : theme.colors.border,
            color: theme.colors.text,
          },
        ]}
      />

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={{ marginTop: theme.spacing.xl }}>
        <PrimaryButton label="Save expense" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
      </View>
    </View>
  );
}
