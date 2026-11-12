import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  appBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8, minHeight: 56 },
  appBarText: { flex: 1, minWidth: 0, gap: 1 },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 16 },
  grid2: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, minWidth: 0 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  items: { marginTop: 10 },
  section: { gap: 10 },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  sum: { gap: 8 },
  sumLabel: { fontSize: 14, fontWeight: '500' },
  sumValue: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  divider: { height: 1, marginVertical: 2 },
  grandLabel: { fontSize: 16, fontWeight: '600' },
  grandValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
});
