import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  // Redesign B02c: violet header, rounded 36 at the bottom, content sitting on its bottom edge.
  hero: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroLift: { shadowColor: '#5B48D8', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 8 },
  heroInner: { width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 28, gap: 14 },
  // width/height/borderRadius come from LoginScreen's keyboard-driven animated style.
  logo: { borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.95)' },
  // fontSize/lineHeight come from LoginScreen's keyboard-driven animated style.
  headline: { fontWeight: '600', letterSpacing: -1 },
  body: { flexGrow: 1, width: '100%', alignSelf: 'center', paddingTop: 24 },
  subtitle: { fontSize: 15, lineHeight: 21 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 18 },
  rememberLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  rememberTextCol: { flexShrink: 1 },
  rememberTitle: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  link: { fontSize: 13, fontWeight: '600' },
  banner: { marginTop: 18 },
  bannerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  spacer: { flexGrow: 1, minHeight: 24 },
  lockNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
});
