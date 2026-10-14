import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  input: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 },
  pickerButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: { borderTopWidth: 1, padding: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1, borderRadius: 12, alignSelf: 'flex-start' },
  stepperButton: { width: 44, alignItems: 'center', justifyContent: 'center' },
});
