import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  logo: { width: 56, height: 56, borderRadius: 28, alignSelf: 'center' },
  headline: { textAlign: 'center', textTransform: 'uppercase', marginTop: 22 },
  subtitle: { textAlign: 'center', marginTop: 12 },
  rememberRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18, gap: 4 },
  rememberTextCol: { flex: 1, minWidth: 0 },
  rememberHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  bannerText: { flex: 1 },
});
