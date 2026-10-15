import { Alert, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PrimaryButton, SecondaryButton } from '@/shared/ui';
import { useManualFeedForm } from '../../hooks';
import { styles } from './styles';

export interface ManualFeedSheetContentProps {
  businessDate: string;
  onClose: () => void;
}

/** branchApp.md screen 22 — Manual Daily Sale Feed, presented as a bottom sheet (addressed by business date, not a record id). */
export function ManualFeedSheetContent({ businessDate, onClose }: ManualFeedSheetContentProps) {
  const theme = useAppTheme();
  const form = useManualFeedForm(businessDate);

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Saved', 'The counted figures have been recorded.', [{ text: 'OK', onPress: onClose }]);
    }
  };

  return (
    <View>
      <View style={[styles.fieldCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Cash</Text>
        <TextInput
          value={form.cashInput}
          onChangeText={form.setCashInput}
          placeholder="Counted amount"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.amountInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 8 }]}
        />
      </View>
      <View style={[styles.fieldCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Easypaisa</Text>
        <TextInput
          value={form.easypaisaInput}
          onChangeText={form.setEasypaisaInput}
          placeholder="Counted amount"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.amountInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 8 }]}
        />
      </View>
      <View style={[styles.fieldCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Bank</Text>
        <TextInput
          value={form.bankInput}
          onChangeText={form.setBankInput}
          placeholder="Counted amount"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.amountInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 8 }]}
        />
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
        Leave a field blank to leave that figure as it is. Foodpanda is settled by the aggregator and is not counted here.
      </Text>

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onClose} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton label="Save" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
        </View>
      </View>
    </View>
  );
}
