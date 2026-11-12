import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  gapMd: { marginTop: 14 },
  gapLg: { marginTop: 18 },
  // The redesign's `card flat` list: no shadow, tight vertical padding, rows divide themselves.
  listCard: { paddingVertical: 4, shadowOpacity: 0, elevation: 0 },
  emptyList: { paddingVertical: 14, textAlign: 'center' },
  extraBlock: { gap: 8 },
  grid2: { flexDirection: 'row', gap: 10 },
  field: { gap: 7 },
  label: { fontSize: 14, fontWeight: '600' },
  help: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  totals: { flexDirection: 'row', gap: 8, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
  amount: { flex: 1.4, alignItems: 'flex-end' },
  actionsRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  submit: { flex: 1.3 },
});
