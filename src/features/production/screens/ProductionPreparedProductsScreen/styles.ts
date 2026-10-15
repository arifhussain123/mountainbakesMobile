import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  columnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 10, paddingBottom: 8, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1 },
  productCol: { flex: 1, minWidth: 0 },
  todayCol: { width: 44, textAlign: 'center' },
  qtyInput: { width: 58, height: 34, borderRadius: 10, borderWidth: 1, textAlign: 'center', fontSize: 13 },
  footer: { borderTopWidth: 1, padding: 16 },
});
