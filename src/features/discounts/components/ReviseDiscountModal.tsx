import { useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton } from '@/shared/ui';
import type { BranchDiscount } from '@/api';

export interface ReviseDiscountModalProps {
  visible: boolean;
  item: BranchDiscount | null;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (amount: number, reason: string) => void;
  onClose: () => void;
}

/** branchApp.md screen 14 — "Change" a still-open discount claim. */
export function ReviseDiscountModal({ visible, item, isSubmitting, error, onSubmit, onClose }: ReviseDiscountModalProps) {
  const theme = useAppTheme();
  const [amountInput, setAmountInput] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (item) {
      setAmountInput(String(item.amount));
      setReason(item.reason);
    }
  }, [item]);

  const amount = parseFloat(amountInput) || 0;
  const canSubmit = amount > 0 && reason.trim().length >= 3 && !isSubmitting;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: theme.spacing.lg }}>
        <SafeAreaView style={{ backgroundColor: theme.colors.background, borderRadius: theme.radii.lg, padding: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Change Discount</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Icon name="close" color={theme.colors.text} />
            </Pressable>
          </View>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>{item?.demandNumber}</Text>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>AMOUNT (RS.)</Text>
          <TextInput
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
            style={{
              marginTop: 6,
              height: 44,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.sm,
              paddingHorizontal: 14,
              color: theme.colors.text,
              fontWeight: '700',
            }}
          />

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>REASON</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            style={{
              marginTop: 6,
              minHeight: 60,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.sm,
              padding: 12,
              color: theme.colors.text,
              textAlignVertical: 'top',
            }}
          />

          {error ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 8 }]}>{error}</Text> : null}

          <View style={{ marginTop: theme.spacing.lg }}>
            <PrimaryButton label="Save Change" onPress={() => onSubmit(amount, reason.trim())} loading={isSubmitting} disabled={!canSubmit} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
