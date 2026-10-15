import { useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton } from '@/shared/ui';
import type { BranchReturn } from '@/api';

export interface ReviseReturnModalProps {
  visible: boolean;
  item: BranchReturn | null;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (qty: number, reason: string) => void;
  onClose: () => void;
}

/** branchApp.md screen 13 — "Change" a still-open return's quantity (and reason). */
export function ReviseReturnModal({ visible, item, isSubmitting, error, onSubmit, onClose }: ReviseReturnModalProps) {
  const theme = useAppTheme();
  const [qtyInput, setQtyInput] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (item) {
      setQtyInput(String(item.qty));
      setReason(item.reason);
    }
  }, [item]);

  const qty = parseInt(qtyInput, 10) || 0;
  const canSubmit = qty > 0 && !isSubmitting;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: theme.spacing.lg }}>
        <SafeAreaView style={{ backgroundColor: theme.colors.background, borderRadius: theme.radii.lg, padding: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Change Return</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Icon name="close" color={theme.colors.text} />
            </Pressable>
          </View>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>{item?.productName}</Text>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>QUANTITY</Text>
          <TextInput
            value={qtyInput}
            onChangeText={setQtyInput}
            keyboardType="numeric"
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
            placeholder="Optional"
            placeholderTextColor={theme.colors.textSecondary}
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
            <PrimaryButton label="Save Change" onPress={() => onSubmit(qty, reason.trim())} loading={isSubmitting} disabled={!canSubmit} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
