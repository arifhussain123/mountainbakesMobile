import { useMemo } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import {
  FINANCE_PAYMENT_METHODS,
  FINANCE_PAYMENT_METHOD_LABELS,
  useLedgerHeads,
  type FinanceAccount,
  type FinancePaymentMethod,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { FinanceDropdown, type FinanceDropdownOption } from '../../components';
import { useNewFinanceTransactionForm } from '../../hooks/useNewFinanceTransactionForm';
import { styles } from './styles';

const PAYMENT_METHOD_OPTIONS: FinanceDropdownOption[] = FINANCE_PAYMENT_METHODS.map((m) => ({ value: m, label: FINANCE_PAYMENT_METHOD_LABELS[m] }));

export interface NewFinanceTransactionSheetContentProps {
  onClose: () => void;
  onCreated: () => void;
}

export function NewFinanceTransactionSheetContent({ onClose, onCreated }: NewFinanceTransactionSheetContentProps) {
  const theme = useAppTheme();
  const form = useNewFinanceTransactionForm();
  const heads = useLedgerHeads({ type: form.type });
  const headOptions = useMemo<FinanceDropdownOption[]>(
    () => (heads.data ?? []).map((h) => ({ value: h.id, label: h.name, hint: h.code, sublabel: h.groupName ? `${h.code} · ${h.groupName}` : h.code })),
    [heads.data],
  );

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
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>TYPE</Text>
      <View style={[styles.row, { marginTop: 6, gap: 8 }]}>
        {(['income', 'expense'] as const).map((t) => {
          const active = t === form.type;
          return (
            <Pressable
              key={t}
              onPress={() => {
                form.setType(t);
                form.setLedgerHeadId(null);
              }}
              style={[styles.typeToggle, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[theme.typography.body, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
                {t === 'income' ? 'Income' : 'Expense'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>LEDGER HEAD</Text>
      <View style={{ marginTop: 6 }}>
        <FinanceDropdown
          key={form.type}
          options={headOptions}
          value={form.ledgerHeadId}
          onChange={form.setLedgerHeadId}
          placeholder="Select a ledger head"
          loading={heads.isLoading}
          emptyLabel={`No ${form.type} heads configured yet`}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>BUSINESS DATE</Text>
          <View style={[styles.staticField, { marginTop: 6, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>{formatDisplayDate(form.businessDate)}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>AMOUNT</Text>
          <TextInput
            value={form.amountInput}
            onChangeText={form.setAmountInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>DESCRIPTION</Text>
      <TextInput
        value={form.description}
        onChangeText={form.setDescription}
        placeholder="e.g. October office rent"
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
      />

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>ACCOUNT</Text>
      <View style={[styles.row, { marginTop: 6, gap: 8 }]}>
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
        <FinanceDropdown
          options={PAYMENT_METHOD_OPTIONS}
          value={form.paymentMethod}
          onChange={(method) => form.setPaymentMethod(method as FinancePaymentMethod)}
          placeholder="Select a payment method"
        />
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>NOTES (OPTIONAL)</Text>
      <TextInput
        value={form.notes}
        onChangeText={form.setNotes}
        placeholder="Anything an approver should know"
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        style={[styles.input, { marginTop: 6, height: 60, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
      />

      <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>RECEIPT PHOTO *</Text>
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

      <View style={styles.actionsRow}>
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
