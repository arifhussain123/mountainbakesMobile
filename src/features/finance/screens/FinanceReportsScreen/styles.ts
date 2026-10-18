import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  pickerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14, borderWidth: 1 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderWidth: 1 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryCell: { flexBasis: '47%', flexGrow: 1 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 3 },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth },
});
