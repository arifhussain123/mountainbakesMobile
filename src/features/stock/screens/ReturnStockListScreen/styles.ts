import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '700' },
  dimmed: { opacity: 0.7 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  sortButton: { height: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pill: { flex: 1, minWidth: 0, height: 40, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  pillText: { flex: 1, fontWeight: '600' },
  chipScroll: { marginTop: 10 },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sortNote: { marginTop: 8, marginBottom: 4 },
  skeletons: { gap: 8, marginTop: 8 },
  footer: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pageButton: { minWidth: 30, height: 30, paddingHorizontal: 6, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageGap: { width: 18, textAlign: 'center' },
});
