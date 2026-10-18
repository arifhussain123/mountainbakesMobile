import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  periodRow: { flexDirection: 'row', gap: 4, padding: 4 },
  heroCard: { marginTop: 14, borderRadius: 22, padding: 16 },
  heroSubRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  heroSubCard: { flex: 1, borderRadius: 14, padding: 10 },
  statGrid: { marginTop: 10, flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 11 },
  footerRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 11, borderTopWidth: 1 },
});
