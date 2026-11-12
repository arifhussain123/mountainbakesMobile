import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  body: { gap: 16, paddingBottom: 8 },
  flex1: { flex: 1, minWidth: 0 },
  grid2: { flexDirection: 'row', gap: 10 },
  field: { gap: 7 },
  label: { fontSize: 14, fontWeight: '600' },
  // The redesign's read-only `.input`: 52pt, radius 16, 1.5 hairline, leading icon.
  input: { height: 52, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputText: { flex: 1, fontSize: 16, fontWeight: '500' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  addText: { flex: 1, fontSize: 14, fontWeight: '600' },
  reasonInput: { minHeight: 96, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, fontSize: 16, textAlignVertical: 'top' },
  totals: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
  half: { flexBasis: '50%', flexGrow: 0, paddingRight: 8 },
  hint: { fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: -8 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  save: { flex: 1.4 },
});
