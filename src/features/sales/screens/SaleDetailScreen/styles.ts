import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 1 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  printRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  printButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 14 },
});
