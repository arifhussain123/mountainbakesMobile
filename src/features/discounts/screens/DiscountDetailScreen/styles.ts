import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 12 },
  hero: { gap: 10 },
  miniRow: { flexDirection: 'row', gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  final: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amountCard: { paddingVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  action: { flex: 1, height: 48, borderRadius: 16 },
});
