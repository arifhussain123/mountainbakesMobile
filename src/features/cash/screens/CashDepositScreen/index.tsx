import { Alert, Image, Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, InfoBanner, PrimaryButton, SecondaryButton, TextField } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { Eyebrow, SmallButton, TYPE, tintFill } from '@/features/sales/components';
import { useCashDepositForm } from '../../hooks';
import { styles } from './styles';

export interface CashDepositSheetContentProps {
  onClose: () => void;
}

/** Redesign `08 Cash Deposit` — presented as a bottom sheet. */
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
      {form.existingTransferNo ? (
        <InfoBanner kind="info" style={styles.block}>
          {`A deposit was already made for this date (${form.existingTransferNo}). Enter only what this deposit adds.`}
        </InfoBanner>
      ) : null}

      <View style={[styles.sectionHeaderRow, styles.block]}>
        <Eyebrow>Payment details</Eyebrow>
        <SmallButton kind="soft" icon="refresh" label="Auto-fill from DSR" onPress={form.handleAutoFill} disabled={form.autoFillDisabled} />
      </View>
      {form.splitHint ? (
        <InfoBanner kind="warn" style={styles.hint}>
          {form.splitHint}
        </InfoBanner>
      ) : null}
      <View style={styles.fieldsRow}>
        <View style={styles.cell}>
          <TextField label="Cash" value={form.cashInput} onChangeText={form.setCashInput} placeholder="0" keyboardType="decimal-pad" />
        </View>
        <View style={styles.cell}>
          <TextField label="Easypaisa" value={form.easypaisaInput} onChangeText={form.setEasypaisaInput} placeholder="0" keyboardType="decimal-pad" />
        </View>
        <View style={styles.cell}>
          <TextField label="Bank" value={form.bankInput} onChangeText={form.setBankInput} placeholder="0" keyboardType="decimal-pad" />
        </View>
      </View>

      <View
        style={[
          styles.totalCard,
          { backgroundColor: tintFill(theme.isDark, theme.colors.cardFill), borderColor: theme.isDark ? theme.colors.cardBorder : '#E2DBFF' },
        ]}>
        <View style={styles.totalText}>
          <Text style={[TYPE.h3, { color: theme.colors.text }]}>Total amount</Text>
          <Text style={[TYPE.xs, { color: theme.colors.textFaint }]}>Cash + Easypaisa + Bank</Text>
        </View>
        <Text style={[styles.totalValue, { color: theme.colors.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {formatCurrency(form.totalAmount)}
        </Text>
      </View>

      <TextField label="Fuel charges (Rs.)" value={form.fuelInput} onChangeText={form.setFuelInput} placeholder="0" keyboardType="decimal-pad" />
      <Text style={[styles.help, { color: theme.colors.textFaint }]}>
        Delivery charges collected. Booked separately as Fuel income — not part of the Total.
      </Text>

      <TextField label="Note" value={form.note} onChangeText={form.setNote} placeholder="Enter note…" multiline textAlignVertical="top" height={80} />

      <Text style={[styles.label, { color: theme.colors.text }]}>
        Payment picture{form.photoRequired ? <Text style={{ color: theme.colors.primary }}> *</Text> : null}
      </Text>
      {form.photo ? (
        <View style={styles.photoPreview}>
          <Image source={{ uri: form.photo.url }} style={styles.photoImage} resizeMode="cover" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            onPress={form.removePhoto}
            style={[styles.photoRemove, { backgroundColor: theme.colors.background }]}>
            <Icon name="close" size={14} color={theme.colors.text} />
          </Pressable>
        </View>
      ) : (
        <View
          style={[
            styles.photoBox,
            { borderColor: theme.isDark ? theme.colors.border : '#CDD2E4', backgroundColor: theme.isDark ? theme.colors.cardFill : '#FAFBFE' },
          ]}>
          <SmallButton size="sm" kind="soft" icon="camera" label="Camera" onPress={() => void form.capturePhoto('camera')} disabled={form.isPickingPhoto} />
          <SmallButton size="sm" kind="secondary" icon="image" label="Gallery" onPress={() => void form.capturePhoto('gallery')} disabled={form.isPickingPhoto} />
        </View>
      )}
      <Text style={[styles.help, { color: theme.colors.textFaint }]}>Not needed when only fuel charges are entered.</Text>

      {form.submitError ? (
        <InfoBanner kind="bad" style={styles.block}>
          {form.submitError}
        </InfoBanner>
      ) : null}

      <View style={styles.actionsRow}>
        <View style={styles.cell}>
          <SecondaryButton label="Clear" onPress={form.clear} />
        </View>
        <View style={styles.cellWide}>
          <PrimaryButton label="Save deposit" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
        </View>
      </View>
    </View>
  );
}
