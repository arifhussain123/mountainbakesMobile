import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface MiniStatProps {
  label: string;
  value: string;
  valueColor?: string;
  /** Text colours for use on the violet hero (white-on-violet). */
  onHero?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The redesign's `mini`: an uppercase micro-label over a small tabular number. */
export function MiniStat({ label, value, valueColor, onHero, style }: MiniStatProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.box, style]}>
      <Text style={[styles.k, { color: onHero ? 'rgba(255,255,255,0.78)' : theme.colors.textFaint }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.v, { color: valueColor ?? (onHero ? '#FFFFFF' : theme.colors.text) }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, minWidth: 0, gap: 2 },
  k: { fontSize: 10, lineHeight: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  v: { fontSize: 14, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
