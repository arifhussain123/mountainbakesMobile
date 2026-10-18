import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refreshAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  titleRow: { marginTop: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  newSalePill: { height: 42, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterChipsRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyBox: { marginTop: 4, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
});
