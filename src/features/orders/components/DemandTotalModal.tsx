import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import type { ProductionOrder } from '@/api';
import { fulfilledTotals, isVerified, requestedTotals } from '../utils/demandLines';

export interface DemandTotalModalProps {
  order: ProductionOrder | null;
  onClose: () => void;
}

/** The web's "Demand" button: a single total-quantity dialog, not a document viewer. */
export function DemandTotalModal({ order, onClose }: DemandTotalModalProps) {
  const theme = useAppTheme();
  if (!order) return null;

  const verified = isVerified(order);
  const qty = (verified ? fulfilledTotals(order) : requestedTotals(order)).qty;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, textAlign: 'center' }]}>{order.demandNumber}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.lg }]}>
            {verified ? 'TOTAL VERIFIED' : 'TOTAL DEMAND'}
          </Text>
          <Text style={[theme.typography.screenTitle, { color: theme.colors.text, fontSize: 40, textAlign: 'center', marginTop: 4 }]}>
            {qty.toLocaleString()}
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={[styles.closeButton, { borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 280, borderWidth: 1, padding: 24 },
  closeButton: { marginTop: 20, height: 40, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
