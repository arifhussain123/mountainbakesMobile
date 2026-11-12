import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export type PillKind = 'neutral' | 'warn' | 'ok' | 'bad' | 'brand';

export interface PillProps {
  label: string;
  kind?: PillKind;
}

/** The redesign's plain `pill()` (no status dot): a 24pt soft-tinted tag — category, "Due 12 Oct", "in 4 days". */
export function Pill({ label, kind = 'neutral' }: PillProps) {
  const theme = useAppTheme();
  const ink: Record<PillKind, string> = {
    neutral: theme.colors.textSecondary,
    warn: theme.colors.warning,
    ok: theme.colors.success,
    bad: theme.colors.danger,
    brand: theme.isDark ? theme.colors.primary : '#5B48D8',
  };
  const lightFill: Record<PillKind, string> = {
    neutral: '#EEF0F8',
    warn: '#FFF3DC',
    ok: '#E1F7EE',
    bad: '#FDE8E8',
    brand: '#EFEBFF',
  };
  const color = ink[kind];
  return (
    <View style={[styles.pill, { backgroundColor: theme.isDark ? `${color}1F` : lightFill[kind] }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { height: 24, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { fontSize: 11, fontWeight: '600' },
});
