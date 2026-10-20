import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 4, padding: 4 },
  tab: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
