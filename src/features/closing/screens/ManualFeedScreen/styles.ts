import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  stack: { gap: 16 },
  tint: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderRadius: 26, padding: 16 },
  field: { gap: 7 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  help: { fontSize: 12, lineHeight: 17 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, height: 52, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  pre: { fontSize: 15, fontWeight: '600' },
  textInput: { flex: 1, height: '100%', padding: 0, fontSize: 16, fontWeight: '500' },
  notesButton: { height: 52, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  notesButtonText: { fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
