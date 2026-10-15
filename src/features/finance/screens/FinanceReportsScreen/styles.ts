import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  chip: { height: 36, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  headerRow: { flexDirection: 'row', gap: 8, paddingBottom: 8, borderBottomWidth: 1 },
  dataRow: { flexDirection: 'row', gap: 8, paddingVertical: 10, borderBottomWidth: 1 },
});
