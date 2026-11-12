import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 12 },
  hero: { gap: 10 },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniRow: { flexDirection: 'row', gap: 12 },
  statusRow: { flexDirection: 'row', marginBottom: 4 },
  grow: { flex: 1, minWidth: 0 },
  customer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  list: { paddingVertical: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sum: { gap: 8, marginTop: 4 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sumLabel: { fontSize: 14, fontWeight: '500' },
  sumValue: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  divider: { height: 1, marginVertical: 2 },
  grandLabel: { fontSize: 16, fontWeight: '600' },
  grandValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
});
