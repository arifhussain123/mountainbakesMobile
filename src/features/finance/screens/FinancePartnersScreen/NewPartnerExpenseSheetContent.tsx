import { Image, Pressable, Text, TextInput, View } from 'react-native';
import {
  useFinancePartners,
  type FinanceAccount,
  type PartnerTxnKind,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
import { useNewPartnerExpenseForm } from '../../hooks/useNewPartnerExpenseForm';
import { FINANCE_PAYMENT_METHOD_OPTIONS } from '../../utils/paymentMethodOptions';
import { styles } from './styles';

export interface NewPartnerExpenseSheetContentProps {
  initialKind: PartnerTxnKind;
  onClose: () => void;
  onCreated: () => void;
}

export function NewPartnerExpenseSheetContent({ initialKind, onClose, onCreated }: NewPartnerExpenseSheetContentProps) {
  const theme = useAppTheme();
  const form = useNewPartnerExpenseForm(initialKind);
  const { data } = useFinancePartners();
  const partners = data?.partners ?? [];

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
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {(['advance', 'draw'] as PartnerTxnKind[]).map((k) => {
          const active = k === form.txnKind;
          return (
            <Pressable
              key={k}
              onPress={() => form.setTxnKind(k)}
              style={[styles.typeToggle, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[theme.typography.body, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
                {k === 'advance' ? 'Advance' : 'Draw'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>PARTNER</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {partners.map((p) => {
          const active = p.id === form.partner?.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => form.setPartner(p)}
              style={{
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 18,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.border,
              }}>
              <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>{p.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DATE</Text>
          <View style={[styles.staticField, { marginTop: 6, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>{form.businessDate}</Text>
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

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>NOTE (OPTIONAL)</Text>
      <TextInput
        value={form.notes}
        onChangeText={form.setNotes}
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
