import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  grid2: { flexDirection: 'row', gap: 10, marginTop: -16 },
  cell: { flex: 1, minWidth: 0 },
  accessory: { paddingRight: 14 },
  remarksInput: { minHeight: 96, borderWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 14, fontWeight: '500', textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 13, fontWeight: '600' },
});
