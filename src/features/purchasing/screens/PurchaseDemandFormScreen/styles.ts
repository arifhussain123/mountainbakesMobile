import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  line: { borderWidth: 1, padding: 10, marginBottom: 10 },
  lineHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  qtyRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  catalogTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6 },
  footer: { borderTopWidth: 1, padding: 16 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
