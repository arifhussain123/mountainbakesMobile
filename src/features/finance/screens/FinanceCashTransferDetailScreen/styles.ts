import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 5 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  noteBox: { marginTop: 10, padding: 10 },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 48, fontSize: 15 },
  inputMulti: { minHeight: 72, paddingTop: 10, textAlignVertical: 'top' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  decisionButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  linkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
