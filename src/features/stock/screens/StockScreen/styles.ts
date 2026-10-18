import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  headerPad: { paddingHorizontal: 16 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  infoButton: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stockCheckRow: { marginTop: 14 },
  offlinePill: { marginTop: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  searchSortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  sortButton: { width: 44, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sortDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4 },
});
