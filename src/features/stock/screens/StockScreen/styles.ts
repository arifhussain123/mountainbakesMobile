import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  headerPad: { paddingHorizontal: 16 },
  stockCheckRow: { marginTop: 14 },
  quickActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickAction: { flex: 1, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  offlinePill: { marginTop: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  filtersSortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  sortButton: { height: 34, paddingHorizontal: 14, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
