import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PillButton, SecondaryButton } from '@/shared/ui';
import type { ProductionOrder } from '@/api';

export interface CancelDemandModalProps {
  order: ProductionOrder | null;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

/** Matches the web's "Delete Demand" dialog — reason mandatory, min 3 characters, Production sees it on the demand. */
export function CancelDemandModal({ order, isSubmitting, error, onSubmit, onClose }: CancelDemandModalProps) {
  const theme = useAppTheme();
  const [reason, setReason] = useState('');

  if (!order) return null;

  const canSubmit = reason.trim().length >= 3 && !isSubmitting;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Delete Demand</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            {order.demandNumber} · {order.date} {order.time}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>REASON</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Production sees this on the demand."
            placeholderTextColor={theme.colors.textFaint}
            multiline
            style={[
              {
                marginTop: theme.spacing.sm,
                minHeight: 72,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.md,
                padding: theme.spacing.md,
                color: theme.colors.text,
                textAlignVertical: 'top',
              },
            ]}
          />
          {error ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.sm }]}>{error}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Keep Demand" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <PillButton label={isSubmitting ? 'Deleting…' : 'Delete Demand'} onPress={() => onSubmit(reason.trim())} disabled={!canSubmit} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 400, borderWidth: 1, padding: 20 },
});
