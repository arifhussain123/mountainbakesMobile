import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  offlinePill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  picker: { minHeight: 36, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  activeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  activeChip: { minHeight: 32, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4 },
});
