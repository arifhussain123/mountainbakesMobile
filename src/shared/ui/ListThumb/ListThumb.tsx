import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '../Icon';

/** The `.li .thumb` pastel cycle (amber, lilac, mint, aqua, pink) from the redesign. */
const THUMBS = [
  ['#FFE2B8', '#FFC57A'],
  ['#E2DAFF', '#C2B4FF'],
  ['#CFF5E0', '#A5E6C2'],
  ['#CDF2F6', '#A2E3EC'],
  ['#FCDDF7', '#F4B5EE'],
] as const;

export interface ListThumbProps {
  /** Initials ("CP") — or pass `icon`. */
  text?: string;
  icon?: IconName;
  /** Row index; picks the pastel so consecutive rows alternate colours. */
  index?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** A 44pt rounded-square list thumbnail: pastel gradient with navy initials or an icon. */
export function ListThumb({ text, icon, index = 0, size = 44, style }: ListThumbProps) {
  const theme = useAppTheme();
  const box = { width: size, height: size, borderRadius: Math.round(size * 0.34) };
  const ink = theme.isDark ? theme.colors.text : '#2A2466';
  const content = icon ? (
    <Icon name={icon} size={Math.round(size * 0.45)} color={ink} />
  ) : (
    <Text style={[styles.text, { color: ink }]} numberOfLines={1}>
      {text}
    </Text>
  );
  if (theme.isDark) {
    return <View style={[styles.base, box, { backgroundColor: theme.colors.border }, style]}>{content}</View>;
  }
  const c = THUMBS[Math.abs(index) % THUMBS.length];
  return (
    <LinearGradient colors={[c[0], c[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.base, styles.lift, box, style]}>
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  text: { fontSize: 14, fontWeight: '600' },
});
