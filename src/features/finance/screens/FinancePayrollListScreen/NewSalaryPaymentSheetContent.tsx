import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { FINANCE_PAYMENT_METHODS, FINANCE_PAYMENT_METHOD_LABELS, type FinanceAccount, type FinancePaymentMethod } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { EmployeePicker } from '../../components';
import { useNewSalaryPaymentForm } from '../../hooks/useNewSalaryPaymentForm';
import { styles } from './styles';

export interface NewSalaryPaymentSheetContentProps {
  onClose: () => void;
  onCreated: () => void;
}

/** mountainbakesFinance.html screen 07 — New Payslip. Approving posts it under Salaries and adds it to the Salary Ledger. */
export function NewSalaryPaymentSheetContent({ onClose, onCreated }: NewSalaryPaymentSheetContentProps) {
  const theme = useAppTheme();
  const form = useNewSalaryPaymentForm();

  const handleSubmit = async (asDraft: boolean) => {
    const ok = await form.submit(asDraft);
    if (ok) {
      form.reset();
      onCreated();
      onClose();
    }
  };

  const outstandingAdvances = (form.advanceSummary?.advances ?? []).filter((a) => !a.isRecovered);

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>EMPLOYEE</Text>
      <View style={{ marginTop: 6 }}>
        <EmployeePicker value={form.employee} onChange={form.setEmployee} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>SALARY MONTH</Text>
          <View style={[styles.staticField, { marginTop: 6, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>{form.salaryMonth}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PAYMENT DATE</Text>
          <View style={[styles.staticField, { marginTop: 6, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>{form.businessDate}</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>SALARY</Text>
          <TextInput
            value={form.grossInput}
            onChangeText={form.setGrossInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
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
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DEDUCTION</Text>
          <TextInput
            value={form.deductionInput}
            onChangeText={form.setDeductionInput}
            keyboardType="decimal-pad"
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
      </View>

      <View style={{ marginTop: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.background, padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, fontWeight: '600' }]}>Net salary</Text>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatCurrency(form.net)}</Text>
      </View>

      {outstandingAdvances.length > 0 ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>RECOVER OUTSTANDING ADVANCES</Text>
          {outstandingAdvances.map((advance) => {
            const checked = form.recoverAdvanceIds.includes(advance.id);
            return (
              <Pressable
                key={advance.id}
                onPress={() => form.toggleAdvance(advance.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: checked ? theme.colors.primary : theme.colors.border,
                    backgroundColor: checked ? theme.colors.primary : 'transparent',
                  }}
                />
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>
                  {advance.advanceNo} · {formatCurrency(advance.totalAmount)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {FINANCE_PAYMENT_METHODS.map((method) => {
          const active = method === form.paymentMethod;
          return (
            <Pressable
              key={method}
              onPress={() => form.setPaymentMethod(method as FinancePaymentMethod)}
              style={{
                height: 32,
                paddingHorizontal: 12,
                borderRadius: 16,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.border,
              }}>
              <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>{FINANCE_PAYMENT_METHOD_LABELS[method]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>NOTES (OPTIONAL)</Text>
      <TextInput
        value={form.notes}
        onChangeText={form.setNotes}
        placeholder="e.g. Eid bonus included"
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        style={[styles.input, { marginTop: 6, height: 60, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
      />

      <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>PAYSLIP PHOTO *</Text>
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
