import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: { height: 58, flexDirection: 'row', alignItems: 'center' },
  // Redesign `iconbtn`: a white 42pt circle with a soft violet lift (light mode).
  content: { flex: 1, paddingTop: 16 },
  h1: { fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -1 },
  body: { marginTop: 16 },
});
