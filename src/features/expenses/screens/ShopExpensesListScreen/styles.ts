import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { gap: 16, marginBottom: 16 },
  hero: { gap: 6 },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  heroValue: { fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  heroSub: { fontSize: 13, lineHeight: 18 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabLabel: { fontSize: 15, fontWeight: '600' },
});
