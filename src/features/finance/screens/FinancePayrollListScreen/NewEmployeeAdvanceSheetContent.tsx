import { Image, Pressable, Text, TextInput, View } from 'react-native';
import type { FinanceAccount } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { EmployeePicker } from '../../components';
import { useNewEmployeeAdvanceForm } from '../../hooks/useNewEmployeeAdvanceForm';
import { FINANCE_PAYMENT_METHOD_OPTIONS } from '../../utils/paymentMethodOptions';
import { styles } from './styles';

export interface NewEmployeeAdvanceSheetContentProps {
  onClose: () => void;
  onCreated: () => void;
}

/** mountainbakesFinance.html screen 08 — New Advance. Deducted from the employee's next payslip; the bonus part is added back there as Bonus. */
export function NewEmployeeAdvanceSheetContent({ onClose, onCreated }: NewEmployeeAdvanceSheetContentProps) {
  const theme = useAppTheme();
  const form = useNewEmployeeAdvanceForm();

  const handleSubmit = async (asDraft: boolean) => {
    const ok = await form.submit(asDraft);
    if (ok) {
      form.reset();
      onCreated();
      onClose();
    }
  };

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>EMPLOYEE</Text>
      <View style={{ marginTop: 6 }}>
        <EmployeePicker value={form.employee} onChange={form.setEmployee} />
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>DATE</Text>
      <View style={[styles.staticField, { marginTop: 6, borderColor: theme.colors.border }]}>
        <Text style={[theme.typography.body, { color: theme.colors.text }]}>{form.businessDate}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>ADVANCE</Text>
          <TextInput
            value={form.advanceInput}
            onChangeText={form.setAdvanceInput}
            keyboardType="decimal-pad"
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>BONUS</Text>
          <TextInput
            value={form.bonusInput}
            onChangeText={form.setBonusInput}
            keyboardType="decimal-pad"
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>LOAN</Text>
          <TextInput
            value={form.loanInput}
            onChangeText={form.setLoanInput}
            keyboardType="decimal-pad"
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
      </View>

      <View style={{ marginTop: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.background, padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, fontWeight: '600' }]}>Paid now</Text>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatCurrency(form.total)}</Text>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
        The whole of this is deducted from the employee's next payslip. The bonus part is added back there as Bonus.
      </Text>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>PAID FROM</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {(['cash', 'bank'] as FinanceAccount[]).map((a) => {
          const active = a === form.account;
          return (
            <Pressable
              key={a}
              onPress={() => form.setAccount(a)}
              style={[styles.typeToggle, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[theme.typography.body, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
                {a === 'cash' ? 'Cash in Hand' : 'Bank'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>PAYMENT METHOD</Text>
      <View style={{ marginTop: 6 }}>
        <Dropdown options={FINANCE_PAYMENT_METHOD_OPTIONS} value={form.paymentMethod} onChange={form.setPaymentMethod} placeholder="Select a payment method" />
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>HANDOVER PHOTO *</Text>
      {form.photo ? (
        <View style={[styles.photoPreview, { marginTop: 6 }]}>
          <Image source={{ uri: form.photo.url }} style={styles.photoImage} resizeMode="cover" />
          <Pressable accessibilityRole="button" onPress={form.removePhoto} style={[styles.photoRemove, { backgroundColor: theme.colors.background }]}>
            <Icon name="close" size={14} color={theme.colors.text} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.photoRow, { marginTop: 6 }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void form.capturePhoto('camera')}
            disabled={form.isPickingPhoto}
            style={[styles.photoButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Icon name="camera" size={16} color={theme.colors.text} />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>Take Photo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void form.capturePhoto('gallery')}
            disabled={form.isPickingPhoto}
            style={[styles.photoButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Icon name="image" size={16} color={theme.colors.text} />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>Upload</Text>
          </Pressable>
        </View>
      )}

      {form.submitError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text> : null}

      <View style={[styles.actionsRow, { marginTop: theme.spacing.lg }]}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Save as Draft" onPress={() => void handleSubmit(true)} loading={form.isSubmitting} disabled={!form.canSubmit} />
        </View>
        <View style={{ flex: 1.3 }}>
          <PrimaryButton label="Submit for Approval" onPress={() => void handleSubmit(false)} loading={form.isSubmitting} disabled={!form.canSubmit} />
        </View>
      </View>
    </View>
  );
}
