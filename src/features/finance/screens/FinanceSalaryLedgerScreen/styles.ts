import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 8 },
  cellsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cellColumn: { alignItems: 'center' },
  cell: { width: 16, height: 16, borderRadius: 4 },
});
