import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 16 },
  eventCard: { gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  wide: { flex: 1.5, minWidth: 0 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: 2 },
  bannerText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  bold: { fontWeight: '700' },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6, marginBottom: -8 },
  search: { height: 46, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchText: { flex: 1, fontSize: 14, fontWeight: '500' },
  listCard: { paddingVertical: 4, paddingHorizontal: 16 },
  // TextField carries its own 16pt top margin; cancel it inside this gap-spaced column.
  noTopGap: { marginTop: -16 },
  notesInput: { minHeight: 96, marginTop: 8, borderWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 14, fontWeight: '500', textAlignVertical: 'top' },
  tint: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderRadius: 26, padding: 16 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#171A35',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
});
