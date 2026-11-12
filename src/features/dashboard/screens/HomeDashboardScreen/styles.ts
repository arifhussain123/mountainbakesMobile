import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Redesign `.body`: 20pt side gutters, 16pt between blocks.
  body: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
  stack: { gap: 12 },
  offline: { marginHorizontal: 20, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  titleCol: { flex: 1, minWidth: 0, gap: 4 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  iconBtnLift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 3 },
  grid3: { flexDirection: 'row', gap: 8 },
  smallSeg: { width: 130 },
  center: { textAlign: 'center' },
  gapTop: { marginTop: 12 },
  subline: { marginTop: -8 },
});
