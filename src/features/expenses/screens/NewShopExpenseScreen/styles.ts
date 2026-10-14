import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  descriptionInput: { height: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  remarksInput: { minHeight: 64, borderWidth: 1, borderRadius: 14, padding: 12, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: { height: 36, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  paymentRow: { flexDirection: 'row', gap: 8 },
  paymentChip: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
