import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { gap: 16, marginBottom: 16 },
  hero: { gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  eyebrow: { fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.6 },
  heroTitle: { fontSize: 26, lineHeight: 32, fontWeight: '600', letterSpacing: -0.6 },
  heroSub: { fontSize: 13, lineHeight: 18 },
  heroButton: {
    alignSelf: 'flex-start',
    height: 38,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  grid3: { flexDirection: 'row', gap: 8 },
});
