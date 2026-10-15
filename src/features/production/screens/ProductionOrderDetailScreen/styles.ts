import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 1 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  balanceCell: { width: '42%', minWidth: 120 },
  returnedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  printRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  printButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: 14 },
});
