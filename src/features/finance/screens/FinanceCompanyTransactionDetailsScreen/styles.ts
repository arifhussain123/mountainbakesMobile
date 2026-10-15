import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', gap: 4, padding: 4, marginTop: 8 },
  tab: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cellsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cellColumn: { alignItems: 'center' },
  cell: { width: 16, height: 16, borderRadius: 4 },
});
