import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  addProductButton: { height: 44, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  numberInput: { height: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  notesInput: { minHeight: 72, borderWidth: 1, borderRadius: 14, padding: 12, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 8, marginTop: 16 },
});
