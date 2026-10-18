import { Image, StyleSheet, Text, View } from 'react-native';
import { images } from '@/assets';
import { useAppTheme } from '@/shared/theme';
import { HEADER_LOGO_SIZE, HEADER_PADDING_VERTICAL, HEADER_ROLE_FONT_SIZE, HEADER_TITLE_FONT_SIZE, ROW_HORIZONTAL_PADDING } from './drawerLayout';

export interface DrawerHeaderProps {
  roleLabel: string;
  /** Status-bar safe-area inset, added ABOVE the header's own padding — `drawerLayout.ts#HEADER_HEIGHT` deliberately excludes it. */
  insetTop: number;
}

/** Logo + "Mountain Bakes" + role on `colors.background`, starting below the status bar. */
export function DrawerHeader({ roleLabel, insetTop }: DrawerHeaderProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { paddingTop: insetTop + HEADER_PADDING_VERTICAL, paddingBottom: HEADER_PADDING_VERTICAL, paddingHorizontal: ROW_HORIZONTAL_PADDING }]}>
      <View style={{ width: HEADER_LOGO_SIZE, height: HEADER_LOGO_SIZE, borderRadius: HEADER_LOGO_SIZE / 2, overflow: 'hidden' }}>
        <Image source={images.logo} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={{ marginLeft: theme.spacing.md, flexShrink: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: HEADER_TITLE_FONT_SIZE, fontWeight: '700' }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          Mountain Bakes
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: HEADER_ROLE_FONT_SIZE, marginTop: 2 }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {roleLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: '100%', height: '100%' },
});
