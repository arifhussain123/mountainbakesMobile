import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { useCashDepositForm } from '../../hooks';
import { styles } from './styles';

export interface CashDepositSheetContentProps {
  onClose: () => void;
}

/** branchApp.md screen 08 — Cash Deposit, presented as a bottom sheet. */
export function CashDepositSheetContent({ onClose }: CashDepositSheetContentProps) {
  const theme = useAppTheme();
  const form = useCashDepositForm();

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Deposit saved', 'Finance will review it and post the receipt.', [{ text: 'OK', onPress: onClose }]);
    }
  };

  return (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PAYMENT DETAILS</Text>
        <Pressable accessibilityRole="button" onPress={form.handleAutoFill} disabled={form.autoFillDisabled}>
          <Text style={[theme.typography.label, { color: form.autoFillDisabled ? theme.colors.textFaint : theme.colors.primary, fontWeight: '700' }]}>
            Auto
          </Text>
        </Pressable>
      </View>
      {form.splitHint ? (
        <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 4 }]}>{form.splitHint}</Text>
      ) : null}
      <View style={[styles.fieldsRow, { marginTop: 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Cash</Text>
          <TextInput
            value={form.cashInput}
            onChangeText={form.setCashInput}
            placeholder="0"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Easypaisa</Text>
          <TextInput
            value={form.easypaisaInput}
            onChangeText={form.setEasypaisaInput}
            placeholder="0"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Bank</Text>
          <TextInput
            value={form.bankInput}
            onChangeText={form.setBankInput}
            placeholder="0"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
          />
        </View>
      </View>

      <View style={[styles.totalCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: theme.spacing.md }]}>
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Total Amount</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>Cash + Easypaisa + Bank</Text>
        </View>
        <Text style={[theme.typography.sectionTitle, { color: theme.colors.primary }]}>{formatCurrency(form.totalAmount)}</Text>
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>FUEL CHARGES</Text>
      <TextInput
        value={form.fuelInput}
        onChangeText={form.setFuelInput}
        placeholder="0"
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType="decimal-pad"
        style={[styles.amountInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
      />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
        Delivery charges collected. Booked separately as Fuel income — not part of the Total.
      </Text>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>NOTE</Text>
      <TextInput
        value={form.note}
        onChangeText={form.setNote}
        placeholder="Enter note…"
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        style={[styles.noteInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
      />

      <Text style={[theme.typography.label, { color: form.photoRequired ? theme.colors.danger : theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
        PAYMENT PICTURE{form.photoRequired ? ' *' : ''}
      </Text>
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
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>Capture</Text>
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
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>Not needed when only Fuel Charges are entered.</Text>

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={[styles.actionsRow, { marginTop: theme.spacing.lg }]}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Clear" onPress={form.clear} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton label="Save Deposit" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
        </View>
      </View>
    </View>
  );
}
