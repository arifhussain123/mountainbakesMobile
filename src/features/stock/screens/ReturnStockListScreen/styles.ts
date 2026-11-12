import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1, minWidth: 0 },
  dimmed: { opacity: 0.7 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  pillGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: { flex: 1, minWidth: 0, height: 42, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  pillText: { flex: 1, fontSize: 13, fontWeight: '600' },
  chipScroll: { marginTop: 12 },
  sortNote: { marginTop: 10, marginBottom: 6 },
  skeletons: { gap: 8, marginTop: 8 },
  footer: { marginTop: 16, alignItems: 'center', gap: 12 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 },
  pageGap: { width: 18, textAlign: 'center' },
});
