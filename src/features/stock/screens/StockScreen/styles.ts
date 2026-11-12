import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  headerPad: { paddingHorizontal: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: -2, marginBottom: 6 },
  banner: { marginTop: 8, paddingVertical: 8 },
  listHeader: { gap: 14, marginTop: 8, marginBottom: 14 },
  searchSortRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardColumns: { marginHorizontal: -4 },
  cardCell: { width: '50%', paddingHorizontal: 4 },
});
