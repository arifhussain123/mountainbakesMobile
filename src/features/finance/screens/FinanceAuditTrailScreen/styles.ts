import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  diffRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth },
  diffKey: { flexBasis: '30%' },
  diffValues: { flex: 1 },
});
