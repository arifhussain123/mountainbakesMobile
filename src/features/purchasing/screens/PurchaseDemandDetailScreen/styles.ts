import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1 },
  subCard: { borderWidth: 1, padding: 10, marginTop: 10 },
  tableHead: { flexDirection: 'row', gap: 6, marginTop: 10, paddingBottom: 6, borderBottomWidth: 1 },
  tableRow: { flexDirection: 'row', gap: 6, paddingVertical: 8, borderBottomWidth: 1, alignItems: 'flex-start' },
  colItem: { flex: 1, minWidth: 0 },
  colNum: { width: 58, textAlign: 'right' },
  colMoney: { width: 76, textAlign: 'right' },
  event: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
