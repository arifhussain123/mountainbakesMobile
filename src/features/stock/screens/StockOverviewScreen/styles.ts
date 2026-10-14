import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  totalsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  quickActionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  quickAction: { flex: 1, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
