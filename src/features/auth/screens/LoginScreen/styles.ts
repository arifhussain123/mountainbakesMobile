import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 26,
  },
  logo: { width: 56, height: 56, borderRadius: 28, alignSelf: 'center' },
  headline: { marginTop: 22, textAlign: 'center' },
  subtitle: { marginTop: 12, textAlign: 'center' },
  field: { marginTop: 16 },
  link: { minHeight: 44, justifyContent: 'center', paddingLeft: 8 },
  banner: { marginTop: 18 },
  button: { marginTop: 20 },
});
