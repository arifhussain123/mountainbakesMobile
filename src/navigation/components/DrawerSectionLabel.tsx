import { StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export function DrawerSectionLabel({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <Text style={[theme.typography.label, styles.label, { color: theme.colors.drawer.textMuted }]}>{label.toUpperCase()}</Text>
  );
}

const styles = StyleSheet.create({
  label: { paddingHorizontal: 20, marginTop: 16, marginBottom: 6, letterSpacing: 1 },
});
