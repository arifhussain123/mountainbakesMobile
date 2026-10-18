import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  statsRow: { flexDirection: 'row', gap: 8 },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  stepButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabs: { paddingHorizontal: 16, paddingTop: 8 },
});
