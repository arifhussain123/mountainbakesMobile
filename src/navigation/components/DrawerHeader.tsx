import { Image, StyleSheet, Text, View } from 'react-native';
import { images } from '@/assets';
import { useAppTheme } from '@/shared/theme';
import { HEADER_LOGO_SIZE, HEADER_NAME_FONT_SIZE, HEADER_PADDING_VERTICAL, HEADER_ROLE_FONT_SIZE } from './drawerLayout';

export interface DrawerHeaderProps {
  roleLabel: string;
  /** Status-bar safe-area inset, added ABOVE the header's own padding — see `drawerLayout.ts#HEADER_HEIGHT`, which deliberately excludes this. */
  insetTop: number;
}

/** Logo badge + "Mountain Bakes" + role, pinned at the top of the drawer — `colors.surface` with a hairline border below, same chrome as the rest of the app. */
export function DrawerHeader({ roleLabel, insetTop }: DrawerHeaderProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.row,
        {
          paddingTop: insetTop + HEADER_PADDING_VERTICAL,
          paddingBottom: HEADER_PADDING_VERTICAL,
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}>
      <Image source={images.logo} style={[styles.logo, { width: HEADER_LOGO_SIZE, height: HEADER_LOGO_SIZE, borderRadius: HEADER_LOGO_SIZE / 2 }]} />
      <View style={{ marginLeft: theme.spacing.md, flexShrink: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: HEADER_NAME_FONT_SIZE, fontWeight: '700' }} numberOfLines={1}>
          Mountain Bakes
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: HEADER_ROLE_FONT_SIZE, marginTop: 2 }} numberOfLines={1}>
          {roleLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: {},
});
