import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 8, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 8 },
  stepsRow: { flexDirection: 'row', gap: 6 },
  stepButton: { flex: 1, height: 32, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', gap: 10 },
});
