import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  fieldsRow: { flexDirection: 'row', gap: 8 },
  amountInput: { height: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontWeight: '700' },
  totalCard: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteInput: { minHeight: 64, borderWidth: 1, borderRadius: 14, padding: 12, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1, height: 46, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  photoPreview: { height: 120, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
});
