import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '../Icon';

export type InfoBannerKind = 'info' | 'warn' | 'bad' | 'ok' | 'brand';

export interface InfoBannerProps {
  kind?: InfoBannerKind;
  icon?: IconName;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ICON: Record<InfoBannerKind, IconName> = {
  info: 'info',
  warn: 'warning',
  bad: 'warning',
  ok: 'check',
  brand: 'info',
};

/** The redesign's `banner`: a soft tinted strip with an icon and one or two lines of text. */
export function InfoBanner({ kind = 'info', icon, children, style }: InfoBannerProps) {
  const theme = useAppTheme();
  const ink: Record<InfoBannerKind, string> = {
    info: theme.colors.info,
    warn: theme.colors.warning,
    bad: theme.colors.danger,
    ok: theme.colors.success,
    brand: theme.isDark ? '#C9BEFF' : '#5B48D8',
  };
  const color = ink[kind];
  return (
    <View style={[styles.box, { backgroundColor: `${color}${theme.isDark ? '24' : '17'}` }, style]}>
      <View style={styles.icon}>
        <Icon name={icon ?? DEFAULT_ICON[kind]} size={18} color={color} />
      </View>
      {typeof children === 'string' ? <Text style={[styles.text, { color }]}>{children}</Text> : <View style={styles.grow}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  icon: { marginTop: 1 },
  text: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  grow: { flex: 1 },
});
