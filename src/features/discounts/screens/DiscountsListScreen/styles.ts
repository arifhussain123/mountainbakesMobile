import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  activeFiltersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14 },
  offlinePill: { marginHorizontal: 20, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
});
