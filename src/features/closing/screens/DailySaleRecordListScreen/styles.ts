import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28 },
  header: { gap: 16, marginBottom: 16 },
  grid2: { flexDirection: 'row', gap: 10 },
  smallButton: { flex: 1, height: 38, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  smallButtonText: { fontSize: 13, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  sm: { fontSize: 13, lineHeight: 18 },
  offlinePill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  tiles: { gap: 8 },
  tileRow: { flexDirection: 'row', gap: 8 },
  bannerText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  bold: { fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  toolChip: { height: 36, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14 },
  toolChipText: { fontSize: 13, fontWeight: '600' },
  footer: { gap: 16, marginTop: 4 },
  tint: { borderRadius: 26, padding: 16, gap: 12 },
  tintRow: { flexDirection: 'row', gap: 12 },
});
