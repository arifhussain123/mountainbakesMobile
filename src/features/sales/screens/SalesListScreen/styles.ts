import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: { gap: 16, marginBottom: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchGrow: { flex: 1, minWidth: 0 },
  sortChip: { height: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortText: { fontSize: 13, fontWeight: '600' },
});
