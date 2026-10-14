import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 26, paddingTop: 8, paddingBottom: 28 },
  logo: { width: 170, height: 170, borderRadius: 85, alignSelf: 'center' },
  spacer: { flex: 1 },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', marginTop: 16 },
  featuresRow: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, paddingVertical: 14, marginTop: 20 },
  featureItem: { flex: 1, alignItems: 'center', gap: 8 },
  featureItemBordered: { borderLeftWidth: 1 },
  nextButton: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 16 },
  dot: { height: 4, borderRadius: 2 },
  skip: { marginTop: 16, height: 20, textAlign: 'center' },
});
